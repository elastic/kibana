/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';

import { SearchHit } from '@elastic/elasticsearch/api/types';
import { Logger } from '@kbn/logging';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { SavedObject } from '../../../../../../../src/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../../../../alerting/common';
import { AlertType } from '../../../../../alerting/server';
import { ListClient } from '../../../../../lists/server';
import { TechnicalRuleFieldMap } from '../../../../../rule_registry/common/assets/field_maps/technical_rule_field_map';
import { TypeOfFieldMap } from '../../../../../rule_registry/common/field_map';
import {
  AlertTypeWithExecutor,
  PersistenceServices,
  IRuleDataClient,
} from '../../../../../rule_registry/server';
import { BaseHit } from '../../../../common/detection_engine/types';
import { ConfigType } from '../../../config';
import { SetupPlugins } from '../../../plugin';
import { RuleParams } from '../schemas/rule_schemas';
import { BuildRuleMessage } from '../signals/rule_messages';
import { AlertAttributes, BulkCreate, WrapHits, WrapSequences } from '../signals/types';
import { AlertsFieldMap, RulesFieldMap } from './field_maps';
import { ExperimentalFeatures } from '../../../../common/experimental_features';
import { IEventLogService } from '../../../../../event_log/server';

export interface SecurityAlertTypeReturnValue<TState extends AlertTypeState> {
  bulkCreateTimes: string[];
  createdSignalsCount: number;
  createdSignals: unknown[];
  errors: string[];
  lastLookbackDate?: Date | null;
  searchAfterTimes: string[];
  state: TState;
  success: boolean;
  warning: boolean;
  warningMessages: string[];
}

type SimpleAlertType<
  TState extends AlertTypeState,
  TParams extends AlertTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {}
> = AlertType<TParams, TParams, TState, AlertInstanceState, TAlertInstanceContext, string, string>;

export interface RunOpts<TParams extends RuleParams> {
  buildRuleMessage: BuildRuleMessage;
  bulkCreate: BulkCreate;
  exceptionItems: ExceptionListItemSchema[];
  listClient: ListClient;
  rule: SavedObject<AlertAttributes<TParams>>;
  searchAfterSize: number;
  tuple: {
    to: Moment;
    from: Moment;
    maxSignals: number;
  };
  wrapHits: WrapHits;
  wrapSequences: WrapSequences;
}

export type SecurityAlertTypeExecutor<
  TState extends AlertTypeState,
  TServices extends PersistenceServices<TAlertInstanceContext>,
  TParams extends RuleParams,
  TAlertInstanceContext extends AlertInstanceContext = {}
> = (
  options: Parameters<SimpleAlertType<TState, TParams, TAlertInstanceContext>['executor']>[0] & {
    runOpts: RunOpts<TParams>;
  } & { services: TServices }
) => Promise<SecurityAlertTypeReturnValue<TState>>;

type SecurityAlertTypeWithExecutor<
  TState extends AlertTypeState,
  TServices extends PersistenceServices<TAlertInstanceContext>,
  TParams extends RuleParams,
  TAlertInstanceContext extends AlertInstanceContext = {}
> = Omit<
  AlertType<TParams, TParams, TState, AlertInstanceState, TAlertInstanceContext, string, string>,
  'executor'
> & {
  executor: SecurityAlertTypeExecutor<TState, TServices, TParams, TAlertInstanceContext>;
};

export type CreateSecurityRuleTypeFactory = (options: {
  lists: SetupPlugins['lists'];
  logger: Logger;
  config: ConfigType;
  ruleDataClient: IRuleDataClient;
  eventLogService: IEventLogService;
}) => <
  TParams extends RuleParams & { index?: string[] | undefined },
  TAlertInstanceContext extends AlertInstanceContext,
  TServices extends PersistenceServices<TAlertInstanceContext>,
  TState extends AlertTypeState
>(
  type: SecurityAlertTypeWithExecutor<TState, TServices, TParams, TAlertInstanceContext>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => AlertTypeWithExecutor<TState, TParams, TAlertInstanceContext, any>;

export type RACAlertSignal = TypeOfFieldMap<AlertsFieldMap> & TypeOfFieldMap<RulesFieldMap>;
export type RACAlert = Exclude<
  TypeOfFieldMap<TechnicalRuleFieldMap> & RACAlertSignal,
  '@timestamp'
> & {
  '@timestamp': string;
};

export type RACSourceHit = SearchHit<RACAlert>;
export type WrappedRACAlert = BaseHit<RACAlert>;

export interface CreateRuleOptions {
  experimentalFeatures: ExperimentalFeatures;
  lists: SetupPlugins['lists'];
  logger: Logger;
  config: ConfigType;
  ml?: SetupPlugins['ml'];
  ruleDataClient: IRuleDataClient;
  version: string;
  eventLogService: IEventLogService;
}
