/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import {
  RuleExecutorOptions,
  AlertInstanceContext,
  AlertInstanceState,
  RuleType,
  RuleTypeParams,
  RuleTypeState,
} from '@kbn/alerting-plugin/server';
import { WithoutReservedActionGroups } from '@kbn/alerting-plugin/common';
import { IRuleDataClient } from '../rule_data_client';
import { BulkResponseErrorAggregation } from './utils';
import { AlertWithCommonFieldsLatest } from '../../common/schemas';

export type PersistenceAlertService = <T>(
  alerts: Array<{
    _id: string;
    _source: T;
  }>,
  refresh: boolean | 'wait_for',
  maxAlerts?: number,
  enrichAlerts?: (
    alerts: Array<{
      _id: string;
      _source: T;
    }>,
    params: { spaceId: string }
  ) => Promise<
    Array<{
      _id: string;
      _source: T;
    }>
  >
) => Promise<PersistenceAlertServiceResult<T>>;

export interface PersistenceAlertServiceResult<T> {
  createdAlerts: Array<AlertWithCommonFieldsLatest<T> & { _id: string; _index: string }>;
  errors: BulkResponseErrorAggregation;
  alertsWereTruncated: boolean;
}

export interface PersistenceServices {
  alertWithPersistence: PersistenceAlertService;
}

export type PersistenceAlertType<
  TParams extends RuleTypeParams,
  TState extends RuleTypeState,
  TInstanceContext extends AlertInstanceContext = {},
  TActionGroupIds extends string = never
> = Omit<
  RuleType<TParams, TParams, TState, AlertInstanceState, TInstanceContext, TActionGroupIds>,
  'executor'
> & {
  executor: (
    options: RuleExecutorOptions<
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
  TParams extends RuleTypeParams,
  TState extends RuleTypeState,
  TInstanceContext extends AlertInstanceContext = {},
  TActionGroupIds extends string = never
>(
  type: PersistenceAlertType<TParams, TState, TInstanceContext, TActionGroupIds>
) => RuleType<TParams, TParams, TState, AlertInstanceState, TInstanceContext, TActionGroupIds>;
