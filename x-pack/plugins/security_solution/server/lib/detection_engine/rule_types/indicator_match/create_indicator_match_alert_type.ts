/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { INDICATOR_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../common/constants';

import type { ThreatRuleParams } from '../../schemas/rule_schemas';
import { threatRuleParams } from '../../schemas/rule_schemas';
import { threatMatchExecutor } from '../../signals/executors/threat_match';
import { getThreatMatchProfile } from '../../signals/threat_mapping/get_threat_profile';
import type { CreateRuleOptions, SecurityAlertType } from '../types';
import { validateIndexPatterns } from '../utils';

export const createIndicatorMatchAlertType = (
  createOptions: CreateRuleOptions,
  profile = false
): SecurityAlertType<ThreatRuleParams, {}, {}, 'default'> => {
  const { eventsTelemetry, version } = createOptions;
  return {
    id: INDICATOR_RULE_TYPE_ID,
    name: 'Indicator Match Rule',
    ruleTaskTimeout: '1h',
    validate: {
      params: {
        validate: (object: unknown) => {
          const [validated, errors] = validateNonExact(object, threatRuleParams);
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
    profile,
    async executor(execOptions) {
      const {
        filters,
        language,
        query,
        runOpts: {
          inputIndex,
          runtimeMappings,
          completeRule,
          tuple,
          listClient,
          ruleExecutionLogger,
          searchAfterSize,
          bulkCreate,
          wrapHits,
          primaryTimestamp,
          secondaryTimestamp,
          exceptionFilter,
          unprocessedExceptions,
        },
        services,
        threatFilters,
        threatIndex,
        threatLanguage,
        threatMapping,
        threatQuery,
        state,
      } = execOptions;
      if (profile) {
        const profileResult = await getThreatMatchProfile({
          filters,
          inputIndex,
          language,
          query,
          services,
          threatFilters,
          threatIndex,
          threatLanguage,
          threatMapping,
          threatQuery,
          tuple,
          primaryTimestamp,
          secondaryTimestamp,
          exceptionFilter,
        });
        return { profileResult, state };
      }

      const result = await threatMatchExecutor({
        inputIndex,
        runtimeMappings,
        completeRule,
        tuple,
        listClient,
        services,
        version,
        searchAfterSize,
        ruleExecutionLogger,
        eventsTelemetry,
        bulkCreate,
        wrapHits,
        primaryTimestamp,
        secondaryTimestamp,
        exceptionFilter,
        unprocessedExceptions,
      });
      return { ...result, state };
    },
  };
};
