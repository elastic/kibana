/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/logging';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import { IRuleDataClient } from '../rule_data_client';
import { AlertTypeWithExecutor } from '../types';
import { LifecycleAlertService, createLifecycleExecutor } from './create_lifecycle_executor';

export const createLifecycleRuleTypeFactory =
  ({ logger, ruleDataClient }: { logger: Logger; ruleDataClient: IRuleDataClient }) =>
  <
    TParams extends RuleTypeParams,
    TAlertInstanceContext extends AlertInstanceContext,
    TServices extends {
      alertWithLifecycle: LifecycleAlertService<Record<string, any>, TAlertInstanceContext, string>;
    }
  >(
    type: AlertTypeWithExecutor<Record<string, any>, TParams, TAlertInstanceContext, TServices>
  ): AlertTypeWithExecutor<Record<string, any>, TParams, TAlertInstanceContext, any> => {
    const createBoundLifecycleExecutor = createLifecycleExecutor(logger, ruleDataClient);
    const executor = createBoundLifecycleExecutor<
      TParams,
      RuleTypeState,
      AlertInstanceState,
      TAlertInstanceContext,
      string
    >(type.executor as any);
    return {
      ...type,
      executor: executor as any,
    };
  };
