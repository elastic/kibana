/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { Logger } from '@kbn/logging';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { Moment } from 'moment';
import { SavedObject } from '../../../../../../../src/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../../../../alerting/common';
import { AlertType } from '../../../../../alerting/server';
import { ListClient } from '../../../../../lists/server';
import { TechnicalRuleFieldMaps } from '../../../../../rule_registry/common/assets/field_maps/technical_rule_field_map';
import {
  AlertTypeWithExecutor,
  PersistenceServices,
  RuleDataClient,
} from '../../../../../rule_registry/server';
import { ConfigType } from '../../../config';
import { SetupPlugins } from '../../../plugin';
import { RuleParams } from '../schemas/rule_schemas';
import { BuildRuleMessage } from '../signals/rule_messages';
import { AlertAttributes, BulkCreate, WrapHits } from '../signals/types';

export interface SecurityAlertTypeReturnValue<TState extends AlertTypeState> {
  bulkCreateTimes: string[];
  createdSignals: unknown[];
  errors: string[];
  lastLookbackDate?: Date | null;
  searchAfterTimes: string[];
  state: TState;
  success: boolean;
  warnings: string[];
}

type SimpleAlertType<
  TState extends AlertTypeState,
  TParams extends AlertTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {}
> = AlertType<TParams, TState, AlertInstanceState, TAlertInstanceContext, string, string>;

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
  // wrapHits: WrapHits;
  wrapHits: (hits: Array<estypes.SearchHit<RACAlert>>) => WrappedRACAlert[];
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
  AlertType<TParams, TState, AlertInstanceState, TAlertInstanceContext, string, string>,
  'executor'
> & {
  executor: SecurityAlertTypeExecutor<TState, TServices, TParams, TAlertInstanceContext>;
};

export type CreateSecurityRuleTypeFactory = (options: {
  lists: SetupPlugins['lists'];
  logger: Logger;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  ruleDataClient: RuleDataClient;
}) => <
  TParams extends RuleParams,
  TAlertInstanceContext extends AlertInstanceContext,
  TServices extends PersistenceServices<TAlertInstanceContext>,
  TState extends AlertTypeState
>(
  type: SecurityAlertTypeWithExecutor<TState, TServices, TParams, TAlertInstanceContext>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => AlertTypeWithExecutor<TState, TParams, TAlertInstanceContext, any>;

export interface RACAlert extends TechnicalRuleFieldMaps {
  todo?: undefined;
}

export type WrappedRACAlert = RACAlert;
