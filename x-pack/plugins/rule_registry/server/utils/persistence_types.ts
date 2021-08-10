/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiResponse } from '@elastic/elasticsearch';
import { BulkResponse } from '@elastic/elasticsearch/api/types';
import { Logger } from '@kbn/logging';
import { ESSearchRequest } from 'src/core/types/elasticsearch';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../../alerting/server';
import { RuleDataClient } from '../rule_data_client';
import { AlertTypeWithExecutor } from '../types';

export type PersistenceAlertService<
  TState extends AlertInstanceState = never,
  TContext extends AlertInstanceContext = never,
  TActionGroupIds extends string = never
> = (
  alerts: Array<{
    id: string;
    fields: Record<string, unknown>;
  }>,
  refresh: boolean | 'wait_for'
) => Promise<ApiResponse<BulkResponse, unknown>>;

export type PersistenceAlertQueryService = (
  query: ESSearchRequest
) => Promise<Array<Record<string, unknown>>>;
export interface PersistenceServices<TAlertInstanceContext extends AlertInstanceContext = {}> {
  alertWithPersistence: PersistenceAlertService<TAlertInstanceContext>;
}

export type CreatePersistenceRuleTypeFactory = (options: {
  ruleDataClient: RuleDataClient;
  logger: Logger;
}) => <
  TState extends AlertTypeState,
  TParams extends AlertTypeParams,
  TServices extends PersistenceServices<TAlertInstanceContext>,
  TAlertInstanceContext extends AlertInstanceContext = {}
>(
  type: AlertTypeWithExecutor<TState, TParams, TAlertInstanceContext, TServices>
) => AlertTypeWithExecutor<TState, TParams, TAlertInstanceContext, TServices>;
