/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { PersistenceServices } from '../../../../../../rule_registry/server';
import { EQL_RULE_TYPE_ID } from '../../../../../common/constants';
import { eqlRuleParams, EqlRuleParams } from '../../schemas/rule_schemas';
import { eqlExecutor } from '../../signals/executors/eql';
import { createSecurityRuleTypeFactory } from '../create_security_rule_type_factory';
import { CreateRuleOptions } from '../types';

export const createEqlAlertType = (createOptions: CreateRuleOptions) => {
  const { experimentalFeatures, lists, logger, config, ruleDataClient, version, eventLogService } =
    createOptions;
  const createSecurityRuleType = createSecurityRuleTypeFactory({
    lists,
    logger,
    config,
    ruleDataClient,
    eventLogService,
  });
  return createSecurityRuleType<EqlRuleParams, {}, PersistenceServices, {}>({
    id: EQL_RULE_TYPE_ID,
    name: 'Event Correlation Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          const [validated, errors] = validateNonExact(object, eqlRuleParams);
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
        runOpts: {
          bulkCreate,
          exceptionItems,
          rule,
          searchAfterSize,
          tuple,
          wrapHits,
          wrapSequences,
        },
        services,
        state,
      } = execOptions;

      const result = await eqlExecutor({
        bulkCreate,
        exceptionItems,
        experimentalFeatures,
        logger,
        rule,
        searchAfterSize,
        services,
        tuple,
        version,
        wrapHits,
        wrapSequences,
      });
      return { ...result, state };
    },
  });
};
