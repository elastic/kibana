/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import {
  AlertExecutorOptions,
  AlertInstanceContext,
  AlertInstanceState,
  AlertType,
  AlertTypeParams,
  AlertTypeState,
} from '../../../alerting/server';
import { WithoutReservedActionGroups } from '../../../alerting/common';
import { IRuleDataClient } from '../rule_data_client';

export type PersistenceAlertService = <T>(
  alerts: Array<{
    _id: string;
    _source: T;
  }>,
  refresh: boolean | 'wait_for'
) => Promise<PersistenceAlertServiceResult<T>>;

export interface PersistenceAlertServiceResult<T> {
  createdAlerts: Array<T & { _id: string; _index: string }>;
}

export interface PersistenceServices {
  alertWithPersistence: PersistenceAlertService;
}

export type PersistenceAlertType<
  TParams extends AlertTypeParams,
  TState extends AlertTypeState,
  TInstanceContext extends AlertInstanceContext = {},
  TActionGroupIds extends string = never
> = Omit<
  AlertType<TParams, TParams, TState, AlertInstanceState, TInstanceContext, TActionGroupIds>,
  'executor'
> & {
  executor: (
    options: AlertExecutorOptions<
      TParams,
      TState,
      AlertInstanceState,
      TInstanceContext,
      WithoutReservedActionGroups<TActionGroupIds, never>
    > & {
      services: PersistenceServices;
    }
  ) => Promise<TState | void>;
};

export type CreatePersistenceRuleTypeWrapper = (options: {
  ruleDataClient: IRuleDataClient;
  logger: Logger;
}) => <
  TParams extends AlertTypeParams,
  TState extends AlertTypeState,
  TInstanceContext extends AlertInstanceContext = {},
  TActionGroupIds extends string = never
>(
  type: PersistenceAlertType<TParams, TState, TInstanceContext, TActionGroupIds>
) => AlertType<TParams, TParams, TState, AlertInstanceState, TInstanceContext, TActionGroupIds>;
