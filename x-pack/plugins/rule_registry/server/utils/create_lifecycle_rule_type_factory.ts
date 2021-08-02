/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/logging';
import { RuleDataClient } from '..';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../../alerting/common';
import { AlertInstance } from '../../../alerting/server';
import { AlertTypeWithExecutor } from '../types';
import { createLifecycleExecutor } from './create_lifecycle_executor';

export type LifecycleAlertService<
  TAlertInstanceContext extends Record<string, unknown>,
  TActionGroupIds extends string = string
> = (alert: {
  id: string;
  fields: Record<string, unknown>;
}) => AlertInstance<AlertInstanceState, TAlertInstanceContext, TActionGroupIds>;

export const createLifecycleRuleTypeFactory = ({
  logger,
  ruleDataClient,
}: {
  ruleDataClient: RuleDataClient;
  logger: Logger;
}) => <
  TParams extends AlertTypeParams,
  TAlertInstanceContext extends AlertInstanceContext,
  TServices extends { alertWithLifecycle: LifecycleAlertService<TAlertInstanceContext> }
>(
  type: AlertTypeWithExecutor<TParams, TAlertInstanceContext, TServices>
): AlertTypeWithExecutor<TParams, TAlertInstanceContext, any> => {
  const createBoundLifecycleExecutor = createLifecycleExecutor(logger, ruleDataClient);
  const executor = createBoundLifecycleExecutor<
    TParams,
    AlertTypeState,
    AlertInstanceState,
    TAlertInstanceContext,
    string
  >(type.executor as any);
  return {
    ...type,
    executor: executor as any,
  };
};
