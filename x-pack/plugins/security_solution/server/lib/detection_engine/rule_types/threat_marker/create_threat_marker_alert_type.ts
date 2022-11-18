/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { THREAT_MARKER_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import type { Client } from '@elastic/elasticsearch';
import { scan } from '@kbn/threat-intelligence-plugin/server/scan';
import { SERVER_APP_ID } from '../../../../../common/constants';

import type { ThreatMarkerRuleParams } from '../../rule_schema';
import { threatMarkerRuleParams } from '../../rule_schema';
import type { CreateRuleOptions, SecurityAlertType } from '../types';
import { validateIndexPatterns } from '../utils';

import { createSearchAfterReturnType, getUnprocessedExceptionsWarnings } from '../../signals/utils';

export const createThreatMarkerAlertType = (
  _createOptions: CreateRuleOptions
): SecurityAlertType<ThreatMarkerRuleParams, {}, {}, 'default'> => {
  return {
    id: THREAT_MARKER_RULE_TYPE_ID,
    name: 'Threat Marker',
    validate: {
      params: {
        validate: (object: unknown) => {
          const [validated, errors] = validateNonExact(object, threatMarkerRuleParams);
          if (errors != null) {
            throw new Error(errors);
          }
          if (validated == null) {
            throw new Error('Validation of rule params failed');
          }
          return validated;
        },
        /**
         * validate rule params when rule is bulk edited (update and created in future as well)
         * returned params can be modified (useful in case of version increment)
         * @param mutatedRuleParams
         * @returns mutatedRuleParams
         */
        validateMutatedParams: (mutatedRuleParams) => {
          validateIndexPatterns(mutatedRuleParams.index);

          return mutatedRuleParams;
        },
      },
    },
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    actionVariables: {
      context: [{ name: 'server', description: 'the server' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: false,
    producer: SERVER_APP_ID,
    async executor(execOptions) {
      const {
        runOpts: { ruleExecutionLogger, unprocessedExceptions },
        services,
        state,
        rule: {
          schedule: { interval },
        },
        params: { threatIndex = ['logs-ti_*'], index: eventsIndex = ['filebeat-*'] },
      } = execOptions;

      ruleExecutionLogger.info(
        `Indicator Marker scanning threats=${threatIndex.join()} vs events=${eventsIndex.join()} interval=${interval}`
      );
      const esClient = services.scopedClusterClient.asCurrentUser;

      try {
        await scan(
          { client: esClient as Client, log: ruleExecutionLogger.info },
          { threatIndex, eventsIndex, concurrency: 8, interval, verbose: false }
        );
      } catch (error: unknown) {
        if (error instanceof Error) {
          ruleExecutionLogger.error(error.message);
        }
      }

      const result = createSearchAfterReturnType();
      const exceptionsWarning = getUnprocessedExceptionsWarnings(unprocessedExceptions);
      if (exceptionsWarning) {
        result.warningMessages.push(exceptionsWarning);
      }

      return { ...result, state };
    },
  };
};
