/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { EQL_RULE_TYPE_ID } from '@kbn/securitysolution-rules';

import { SERVER_APP_ID } from '../../../../../common/constants';
import { eqlRuleParams, EqlRuleParams } from '../../schemas/rule_schemas';
import { eqlExecutor } from '../../signals/executors/eql';
import { CreateRuleOptions, SecurityAlertType } from '../types';

export const createEqlAlertType = (
  createOptions: CreateRuleOptions
): SecurityAlertType<EqlRuleParams, {}, {}, 'default'> => {
  const { experimentalFeatures, logger, version } = createOptions;
  return {
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
    producer: SERVER_APP_ID,
    async executor(execOptions) {
      const {
        runOpts: { bulkCreate, exceptionItems, completeRule, tuple, wrapHits, wrapSequences },
        services,
        state,
      } = execOptions;

      const result = await eqlExecutor({
        bulkCreate,
        exceptionItems,
        experimentalFeatures,
        logger,
        completeRule,
        services,
        tuple,
        version,
        wrapHits,
        wrapSequences,
      });
      return { ...result, state };
    },
  };
};
