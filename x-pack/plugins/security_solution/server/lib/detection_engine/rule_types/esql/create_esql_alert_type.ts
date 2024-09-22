/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';

import { SERVER_APP_ID } from '../../../../../common/constants';
import { EsqlRuleParams } from '../../rule_schema';
import { esqlExecutor } from './esql';
import type { CreateRuleOptions, SecurityAlertType, CreateRuleAdditionalOptions } from '../types';

export const createEsqlAlertType = (
  createOptions: CreateRuleOptions & CreateRuleAdditionalOptions
): SecurityAlertType<EsqlRuleParams, {}, {}, 'default'> => {
  const { version, experimentalFeatures, licensing, scheduleNotificationResponseActionsService } =
    createOptions;
  return {
    id: ESQL_RULE_TYPE_ID,
    name: 'ES|QL Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          return EsqlRuleParams.parse(object);
        },
      },
    },
    schemas: {
      params: { type: 'zod', schema: EsqlRuleParams },
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
    executor: (params) =>
      esqlExecutor({
        ...params,
        experimentalFeatures,
        version,
        licensing,
        scheduleNotificationResponseActionsService,
      }),
  };
};
