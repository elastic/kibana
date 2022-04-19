/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import { RuleExecutorOptions, RuleExecutorServices, RuleType } from '@kbn/alerting-plugin/server';
import { AlertsClient } from './alert_data_client/alerts_client';

type SimpleAlertType<
  TState extends RuleTypeState,
  TParams extends RuleTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {}
> = RuleType<TParams, TParams, TState, AlertInstanceState, TAlertInstanceContext, string, string>;

export type AlertTypeExecutor<
  TState extends RuleTypeState,
  TParams extends RuleTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {},
  TServices extends Record<string, any> = {}
> = (
  options: Parameters<SimpleAlertType<TState, TParams, TAlertInstanceContext>['executor']>[0] & {
    services: TServices;
  }
) => Promise<TState | void>;

export type AlertTypeWithExecutor<
  TState extends RuleTypeState = {},
  TParams extends RuleTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {},
  TServices extends Record<string, any> = {}
> = Omit<
  RuleType<TParams, TParams, TState, AlertInstanceState, TAlertInstanceContext, string, string>,
  'executor'
> & {
  executor: AlertTypeExecutor<TState, TParams, TAlertInstanceContext, TServices>;
};

export type AlertExecutorOptionsWithExtraServices<
  Params extends RuleTypeParams = never,
  State extends RuleTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never,
  TExtraServices extends {} = never
> = Omit<
  RuleExecutorOptions<Params, State, InstanceState, InstanceContext, ActionGroupIds>,
  'services'
> & {
  services: RuleExecutorServices<InstanceState, InstanceContext, ActionGroupIds> & TExtraServices;
};

/**
 * @public
 */
export interface RacApiRequestHandlerContext {
  getAlertsClient: () => Promise<AlertsClient>;
}

/**
 * @internal
 */
export interface RacRequestHandlerContext extends RequestHandlerContext {
  rac: RacApiRequestHandlerContext;
}
