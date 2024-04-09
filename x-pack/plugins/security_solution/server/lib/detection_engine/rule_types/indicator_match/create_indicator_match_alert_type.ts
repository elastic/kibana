/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INDICATOR_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';

import { RULE_MANAGEMENT_FEATURE_ID } from '@kbn/security-solution-features/src/constants';
import { SERVER_APP_ID } from '../../../../../common/constants';

import { ThreatRuleParams } from '../../rule_schema';
import { indicatorMatchExecutor } from './indicator_match';
import type { CreateRuleOptions, SecurityAlertType, SignalSourceHit } from '../types';
import { validateIndexPatterns } from '../utils';
import { wrapSuppressedAlerts } from '../utils/wrap_suppressed_alerts';
import type { BuildReasonMessage } from '../utils/reason_formatters';

export const createIndicatorMatchAlertType = (
  createOptions: CreateRuleOptions
): SecurityAlertType<ThreatRuleParams, {}, {}, 'default'> => {
  const { eventsTelemetry, version, licensing } = createOptions;
  return {
    id: INDICATOR_RULE_TYPE_ID,
    name: 'Indicator Match Rule',
    ruleTaskTimeout: '1h',
    validate: {
      params: {
        validate: (object: unknown) => {
          return ThreatRuleParams.parse(object);
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
    schemas: {
      params: { type: 'zod', schema: ThreatRuleParams },
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
    category: DEFAULT_APP_CATEGORIES.security.id,
    producer: RULE_MANAGEMENT_FEATURE_ID,
    async executor(execOptions) {
      const {
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
          inputIndexFields,
        },
        services,
        spaceId,
        state,
      } = execOptions;
      const runOpts = execOptions.runOpts;

      const wrapSuppressedHits = (
        events: SignalSourceHit[],
        buildReasonMessage: BuildReasonMessage
      ) =>
        wrapSuppressedAlerts({
          events,
          spaceId,
          completeRule,
          mergeStrategy: runOpts.mergeStrategy,
          indicesToQuery: runOpts.inputIndex,
          buildReasonMessage,
          alertTimestampOverride: runOpts.alertTimestampOverride,
          ruleExecutionLogger,
          publicBaseUrl: runOpts.publicBaseUrl,
          primaryTimestamp,
          secondaryTimestamp,
        });

      const result = await indicatorMatchExecutor({
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
        inputIndexFields,
        wrapSuppressedHits,
        runOpts,
        licensing,
      });
      return { ...result, state };
    },
  };
};
