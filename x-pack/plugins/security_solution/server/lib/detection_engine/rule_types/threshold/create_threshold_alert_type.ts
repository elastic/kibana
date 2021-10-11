/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';

import { PersistenceServices } from '../../../../../../rule_registry/server';
import { THRESHOLD_RULE_TYPE_ID } from '../../../../../common/constants';
import { thresholdRuleParams, ThresholdRuleParams } from '../../schemas/rule_schemas';
import { thresholdExecutor } from '../../signals/executors/threshold';
import { ThresholdAlertState } from '../../signals/types';
import { createSecurityRuleTypeFactory } from '../create_security_rule_type_factory';
import { CreateRuleOptions } from '../types';

export const createThresholdAlertType = (createOptions: CreateRuleOptions) => {
  const { experimentalFeatures, lists, logger, config, ruleDataClient, version, eventLogService } =
    createOptions;
  const createSecurityRuleType = createSecurityRuleTypeFactory({
    lists,
    logger,
    config,
    ruleDataClient,
    eventLogService,
  });
  return createSecurityRuleType<ThresholdRuleParams, {}, PersistenceServices, ThresholdAlertState>({
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
    producer: 'security-solution',
    async executor(execOptions) {
      const {
        runOpts: { buildRuleMessage, bulkCreate, exceptionItems, rule, tuple, wrapHits },
        services,
        startedAt,
        state,
      } = execOptions;

      // console.log(JSON.stringify(state));

      const result = await thresholdExecutor({
        buildRuleMessage,
        bulkCreate,
        exceptionItems,
        experimentalFeatures,
        logger,
        rule,
        services,
        startedAt,
        state,
        tuple,
        version,
        wrapHits,
      });

      return result;
    },
  });
};
