/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { ESQL_RULE_TYPE_ID } from '@kbn/securitysolution-rules';

import { SERVER_APP_ID } from '../../../../../common/constants';
import type { EsqlRuleParams } from '../../rule_schema';
import { esqlRuleParams } from '../../rule_schema';
import { esqlExecutor } from './esql';
import type { CreateRuleOptions, SecurityAlertType } from '../types';

export const createEsqlAlertType = (
  createOptions: CreateRuleOptions
): SecurityAlertType<EsqlRuleParams, {}, {}, 'default'> => {
  const { version } = createOptions;
  return {
    id: ESQL_RULE_TYPE_ID,
    name: 'ESQL Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          const [validated, errors] = validateNonExact(object, esqlRuleParams);
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
    executor: (params) => esqlExecutor({ ...params, version }),
  };
};
