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
} from '../../alerting/common';
import { AlertType } from '../../alerting/server';

type SimpleAlertType<
  TParams extends AlertTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {}
> = AlertType<TParams, AlertTypeState, AlertInstanceState, TAlertInstanceContext, string, string>;

export type AlertTypeExecutor<
  TParams extends AlertTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {},
  TServices extends Record<string, any> = {}
> = (
  options: Parameters<SimpleAlertType<TParams, TAlertInstanceContext>['executor']>[0] & {
    services: TServices;
  }
) => Promise<any>;

export type AlertTypeWithExecutor<
  TParams extends AlertTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {},
  TServices extends Record<string, any> = {}
> = Omit<
  AlertType<TParams, AlertTypeState, AlertInstanceState, TAlertInstanceContext, string, string>,
  'executor'
> & {
  executor: AlertTypeExecutor<TParams, TAlertInstanceContext, TServices>;
};
