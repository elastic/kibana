/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { THRESHOLD_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../common/constants';

import type { ThresholdRuleParams } from '../../rule_schema';
import { thresholdRuleParams } from '../../rule_schema';
import { thresholdExecutor } from '../../signals/executors/threshold';
import type { ThresholdAlertState } from '../../signals/types';
import type { CreateRuleOptions, SecurityAlertType } from '../types';
import { validateIndexPatterns } from '../utils';

export const createThresholdAlertType = (
  createOptions: CreateRuleOptions
): SecurityAlertType<ThresholdRuleParams, ThresholdAlertState, {}, 'default'> => {
  const { version } = createOptions;
  return {
    id: THRESHOLD_RULE_TYPE_ID,
    name: 'Threshold Rule',
    validate: {
      params: {
        validate: (object: unknown): ThresholdRuleParams => {
          const [validated, errors] = validateNonExact(object, thresholdRuleParams);
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
        runOpts: {
          bulkCreate,
          completeRule,
          tuple,
          wrapHits,
          ruleDataReader,
          inputIndex,
          runtimeMappings,
          primaryTimestamp,
          secondaryTimestamp,
          ruleExecutionLogger,
          aggregatableTimestampField,
          exceptionFilter,
          unprocessedExceptions,
        },
        services,
        startedAt,
        state,
      } = execOptions;
      const result = await thresholdExecutor({
        completeRule,
        tuple,
        ruleExecutionLogger,
        services,
        version,
        startedAt,
        state,
        bulkCreate,
        wrapHits,
        ruleDataReader,
        inputIndex,
        runtimeMappings,
        primaryTimestamp,
        secondaryTimestamp,
        aggregatableTimestampField,
        exceptionFilter,
        unprocessedExceptions,
      });
      return result;
    },
  };
};
