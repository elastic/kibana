/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
} from '../../../../plugins/alerting/server';
import { AlertExecutorOptionsWithExtraServices } from '../types';

import { LifecycleAlertServices, LifecycleRuleExecutor } from './create_lifecycle_executor';

export const createLifecycleRuleExecutorMock =
  <
    Params extends AlertTypeParams = never,
    State extends AlertTypeState = never,
    InstanceState extends AlertInstanceState = never,
    InstanceContext extends AlertInstanceContext = never,
    ActionGroupIds extends string = never
  >(
    executor: LifecycleRuleExecutor<Params, State, InstanceState, InstanceContext, ActionGroupIds>
  ) =>
  async (
    options: AlertExecutorOptionsWithExtraServices<
      Params,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      LifecycleAlertServices<InstanceState, InstanceContext, ActionGroupIds>
    >
  ) =>
    await executor(options);
