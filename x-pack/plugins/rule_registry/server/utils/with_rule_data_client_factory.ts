/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../../alerting/common';
import { AlertType } from '../../../alerting/server';
import { RuleDataClient } from '../rule_data_client';
import { AlertTypeWithExecutor, ExecutorTypeWithExtraServices } from '../types';

export const withRuleDataClientFactory = (ruleDataClient: RuleDataClient) => <
  TParams extends AlertTypeParams = never,
  TState extends AlertTypeState = never,
  TInstanceState extends AlertInstanceState = never,
  TInstanceContext extends AlertInstanceContext = never,
  TActionGroupIds extends string = never,
  TRecoveryActionGroupId extends string = never
>(
  type: AlertTypeWithExecutor<
    TParams,
    TInstanceState,
    TInstanceContext,
    TActionGroupIds,
    TRecoveryActionGroupId,
    ExecutorTypeWithExtraServices<
      TParams,
      TState,
      TInstanceState,
      TInstanceContext,
      TActionGroupIds,
      { ruleDataClient: RuleDataClient }
    >
  >
): AlertType<
  TParams,
  TState,
  TInstanceState,
  TInstanceContext,
  TActionGroupIds,
  TRecoveryActionGroupId
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
