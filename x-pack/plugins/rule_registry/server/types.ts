/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from 'kibana/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../alerting/common';
import { AlertType } from '../../alerting/server';
import { AlertsClient } from './alert_data_client/alerts_client';

type SimpleAlertType<
  TState extends AlertTypeState,
  TParams extends AlertTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {}
> = AlertType<TParams, TState, AlertInstanceState, TAlertInstanceContext, string, string>;

export type AlertTypeExecutor<
  TState extends AlertTypeState,
  TParams extends AlertTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {},
  TServices extends Record<string, any> = {}
> = (
  options: Parameters<SimpleAlertType<TState, TParams, TAlertInstanceContext>['executor']>[0] & {
    services: TServices;
  }
) => Promise<TState>;

export type AlertTypeWithExecutor<
  TState extends AlertTypeState = {},
  TParams extends AlertTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {},
  TServices extends Record<string, any> = {}
> = Omit<
  AlertType<TParams, TState, AlertInstanceState, TAlertInstanceContext, string, string>,
  'executor'
> & {
  executor: AlertTypeExecutor<TState, TParams, TAlertInstanceContext, TServices>;
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
