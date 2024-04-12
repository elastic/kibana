/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';

import { RULE_MANAGEMENT_FEATURE_ID } from '@kbn/security-solution-features/src/constants';
import { SERVER_APP_ID } from '../../../../../common/constants';

import { MachineLearningRuleParams } from '../../rule_schema';
import { mlExecutor } from './ml';
import type { CreateRuleOptions, SecurityAlertType } from '../types';

export const createMlAlertType = (
  createOptions: CreateRuleOptions
): SecurityAlertType<MachineLearningRuleParams, {}, {}, 'default'> => {
  const { ml } = createOptions;
  return {
    id: ML_RULE_TYPE_ID,
    name: 'Machine Learning Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          return MachineLearningRuleParams.parse(object);
        },
      },
    },
    schemas: {
      params: { type: 'zod', schema: MachineLearningRuleParams },
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
          bulkCreate,
          completeRule,
          listClient,
          ruleExecutionLogger,
          tuple,
          wrapHits,
          exceptionFilter,
          unprocessedExceptions,
        },
        services,
        state,
      } = execOptions;

      const result = await mlExecutor({
        completeRule,
        tuple,
        ml,
        listClient,
        services,
        ruleExecutionLogger,
        bulkCreate,
        wrapHits,
        exceptionFilter,
        unprocessedExceptions,
      });
      return { ...result, state };
    },
  };
};
