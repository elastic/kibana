/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceContext, AlertTypeParams } from '../../../alerting/common';
import { RuleDataClient } from '../rule_data_client';
import { AlertTypeWithExecutor } from '../types';

export const withRuleDataClientFactory = (ruleDataClient: RuleDataClient) => <
  TParams extends AlertTypeParams,
  TAlertInstanceContext extends AlertInstanceContext,
  TServices extends Record<string, any> = {}
>(
  type: AlertTypeWithExecutor<
    TParams,
    TAlertInstanceContext,
    TServices & { ruleDataClient: RuleDataClient }
  >
): AlertTypeWithExecutor<
  TParams,
  TAlertInstanceContext,
  TServices & { ruleDataClient: RuleDataClient }
> => {
  return {
    ...type,
    executor: (options) => {
      return type.executor({
        ...options,
        services: {
          ...options.services,
          ruleDataClient,
        },
      });
    },
  };
};
