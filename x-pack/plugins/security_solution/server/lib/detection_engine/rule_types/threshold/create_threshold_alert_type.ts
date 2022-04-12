/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { THRESHOLD_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../common/constants';

import { thresholdRuleParams, ThresholdRuleParams } from '../../schemas/rule_schemas';
import { thresholdExecutor } from '../../signals/executors/threshold';
import { ThresholdAlertState } from '../../signals/types';
import { CreateRuleOptions, SecurityAlertType } from '../types';

export const createThresholdAlertType = (
  createOptions: CreateRuleOptions
): SecurityAlertType<ThresholdRuleParams, ThresholdAlertState, {}, 'default'> => {
  const { experimentalFeatures, logger, version } = createOptions;
  return {
    id: THRESHOLD_RULE_TYPE_ID,
    name: 'Threshold Rule',
    ruleTaskTimeout: experimentalFeatures.securityRulesCancelEnabled ? '5m' : '1d',
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
          buildRuleMessage,
          bulkCreate,
          exceptionItems,
          completeRule,
          tuple,
          wrapHits,
          ruleDataReader,
        },
        services,
        startedAt,
        state,
      } = execOptions;

      const result = await thresholdExecutor({
        buildRuleMessage,
        bulkCreate,
        exceptionItems,
        experimentalFeatures,
        logger,
        completeRule,
        services,
        startedAt,
        state,
        tuple,
        version,
        wrapHits,
        ruleDataReader,
      });

      return result;
    },
  };
};
