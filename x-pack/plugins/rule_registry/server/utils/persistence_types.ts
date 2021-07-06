/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ESSearchRequest } from 'src/core/types/elasticsearch';
import {
  AlertInstance,
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
} from '../../../alerting/server';
import { AlertTypeWithExecutor } from '../types';
import { RuleDataClient } from '../../target/types/server';
import { ListClient } from '../../../lists/target/types/server';

export type PersistenceAlertService<TAlertInstanceContext extends Record<string, unknown>> = (
  alerts: Array<Record<string, unknown>>
) => Array<AlertInstance<AlertInstanceState, TAlertInstanceContext, string>>;

export type PersistenceAlertQueryService = (
  query: ESSearchRequest
) => Promise<Array<Record<string, unknown>>>;

export type CreatePersistenceRuleTypeFactory = (options: {
  ruleDataClient: RuleDataClient;
  logger: Logger;
}) => <
  TParams extends AlertTypeParams,
  TAlertInstanceContext extends AlertInstanceContext,
  TServices extends {
    alertWithPersistence: PersistenceAlertService<TAlertInstanceContext>;
    findAlerts: PersistenceAlertQueryService;
  }
>(
  type: AlertTypeWithExecutor<TParams, TAlertInstanceContext, TServices>
) => AlertTypeWithExecutor<TParams, TAlertInstanceContext, TServices>;
