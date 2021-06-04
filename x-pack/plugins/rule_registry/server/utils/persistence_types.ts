/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  AlertInstance,
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
} from '../../../alerting/server';
import { ESSearchRequest } from '../../../../../typings/elasticsearch';
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
    securityServices?: {
      exceptionItems: ExceptionListItemSchema[];
      listClient: ListClient;
    };
  }
>(
  type: AlertTypeWithExecutor<TParams, TAlertInstanceContext, TServices>
) => AlertTypeWithExecutor<TParams, TAlertInstanceContext, TServices>;

//
// type PersistenceAlertService<TAlertInstanceContext extends Record<string, unknown>> = (
//   alerts: Array<Record<string, unknown>>
// ) => Array<AlertInstance<AlertInstanceState, TAlertInstanceContext, string>>;
//
// export type PersistenceAlertQueryService = (
//   query: ESSearchRequest
// ) => Promise<Array<Record<string, unknown>>>;
//
// export interface PersistenceRuleServicesType<TAlertInstanceContext extends AlertInstanceContext> {
//   alertWithPersistence: PersistenceAlertService<TAlertInstanceContext>;
//   findAlerts: PersistenceAlertQueryService;
// }
//
// export type PersistenceRuleType<
//   TParams extends AlertTypeParams,
//   TAlertInstanceContext extends AlertInstanceContext,
//   TServices extends PersistenceRuleServicesWithSecurityType<TAlertInstanceContext>
// > = AlertTypeWithExecutor<TParams, TAlertInstanceContext, TServices>;
//
// export type PersistenceRuleTypeFactory = <
//   TParams extends AlertTypeParams,
//   TAlertInstanceContext extends AlertInstanceContext,
//   TServices extends PersistenceRuleServicesWithSecurityType<TAlertInstanceContext>
// >(
//   type: AlertTypeWithExecutor<TParams, TAlertInstanceContext, TServices>
// ) => PersistenceRuleType<TParams, TAlertInstanceContext, TServices>;
//
// export type CreatePersistenceRuleTypeFactory = <RuleType>(options: {
//   ruleDataClient: RuleDataClient;
//   logger: Logger;
// }) => PersistenceRuleTypeFactory;
//
// export interface SecurityRuleServicesType {
//   test: string;
// }
//
// export type SecurityRuleType<
//   TParams extends AlertTypeParams,
//   TAlertInstanceContext extends AlertInstanceContext,
//   TServices extends PersistenceRuleServicesWithSecurityType<TAlertInstanceContext>
// > = PersistenceRuleType<TParams, TAlertInstanceContext, TServices>;
//
// export type SecurityRuleTypeFactory = <
//   TParams extends AlertTypeParams,
//   TAlertInstanceContext extends AlertInstanceContext,
//   TServices extends PersistenceRuleServicesWithSecurityType<TAlertInstanceContext>
// >(
//   type: AlertTypeWithExecutor<TParams, TAlertInstanceContext, TServices>
// ) => SecurityRuleType<TParams, TAlertInstanceContext, TServices>;
//
// export type CreateSecurityRuleTypeFactory = (factoryOptions: {
//   ruleDataClient: RuleDataClient;
//   logger: Logger;
//   lists: SetupPlugins['lists'];
// }) => SecurityRuleTypeFactory;
//
// export type PersistenceRuleServicesWithSecurityType<
//   TAlertInstanceContext extends AlertInstanceContext
// > = PersistenceRuleServicesType<TAlertInstanceContext> & SecurityRuleServicesType;
