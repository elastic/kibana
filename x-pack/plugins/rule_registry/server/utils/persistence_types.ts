/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { ESSearchRequest } from 'src/core/types/elasticsearch';
import {
  AlertInstance,
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
} from '../../../alerting/server';
import { AlertTypeWithExecutor } from '../types';
import { RuleDataClient } from '../../target/types/server';

export type PersistenceAlertService<TAlertInstanceContext extends Record<string, unknown>> = (
  alerts: Array<Record<string, unknown>>
) => Array<AlertInstance<AlertInstanceState, TAlertInstanceContext, string>>;

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
  TParams extends AlertTypeParams,
  TServices extends PersistenceServices<TAlertInstanceContext>,
  TAlertInstanceContext extends AlertInstanceContext = {}
>(
  type: AlertTypeWithExecutor<TParams, TAlertInstanceContext, TServices>
) => AlertTypeWithExecutor<TParams, TAlertInstanceContext, TServices>;
