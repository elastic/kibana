/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { THRESHOLD_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';

import { SERVER_APP_ID } from '../../../../../common/constants';

import { ThresholdRuleParams } from '../../rule_schema';
import { thresholdExecutor } from './threshold';
import type { ThresholdAlertState } from './types';
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
          return ThresholdRuleParams.parse(object);
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
    category: DEFAULT_APP_CATEGORIES.security.id,
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
          inputIndexFields,
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
        inputIndexFields,
      });
      return result;
    },
  };
};
