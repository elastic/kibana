/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';

import { Logger } from '@kbn/logging';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { RuleExecutorOptions, RuleType } from '../../../../../alerting/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeState,
  WithoutReservedActionGroups,
} from '../../../../../alerting/common';
import { ListClient } from '../../../../../lists/server';
import {
  PersistenceServices,
  IRuleDataClient,
  IRuleDataReader,
} from '../../../../../rule_registry/server';
import { ConfigType } from '../../../config';
import { SetupPlugins } from '../../../plugin';
import { CompleteRule, RuleParams } from '../schemas/rule_schemas';
import { BuildRuleMessage } from '../signals/rule_messages';
import {
  BulkCreate,
  SearchAfterAndBulkCreateReturnType,
  WrapHits,
  WrapSequences,
} from '../signals/types';
import { ExperimentalFeatures } from '../../../../common/experimental_features';
import { IEventLogService } from '../../../../../event_log/server';
import { ITelemetryEventsSender } from '../../telemetry/sender';
import { RuleExecutionLogForExecutorsFactory } from '../rule_execution_log';

export interface SecurityAlertTypeReturnValue<TState extends RuleTypeState> {
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

export interface RunOpts<TParams extends RuleParams> {
  buildRuleMessage: BuildRuleMessage;
  bulkCreate: BulkCreate;
  exceptionItems: ExceptionListItemSchema[];
  listClient: ListClient;
  completeRule: CompleteRule<TParams>;
  searchAfterSize: number;
  tuple: {
    to: Moment;
    from: Moment;
    maxSignals: number;
  };
  wrapHits: WrapHits;
  wrapSequences: WrapSequences;
  ruleDataReader: IRuleDataReader;
}

export type SecurityAlertType<
  TParams extends RuleParams,
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
      runOpts: RunOpts<TParams>;
    }
  ) => Promise<SearchAfterAndBulkCreateReturnType & { state: TState }>;
};

export interface CreateSecurityRuleTypeWrapperProps {
  lists: SetupPlugins['lists'];
  logger: Logger;
  config: ConfigType;
  ruleDataClient: IRuleDataClient;
  eventLogService: IEventLogService;
  ruleExecutionLoggerFactory: RuleExecutionLogForExecutorsFactory;
}

export type CreateSecurityRuleTypeWrapper = (
  options: CreateSecurityRuleTypeWrapperProps
) => <
  TParams extends RuleParams,
  TState extends RuleTypeState,
  TInstanceContext extends AlertInstanceContext = {}
>(
  type: SecurityAlertType<TParams, TState, TInstanceContext, 'default'>
) => RuleType<TParams, TParams, TState, AlertInstanceState, TInstanceContext, 'default'>;

export interface CreateRuleOptions {
  experimentalFeatures: ExperimentalFeatures;
  logger: Logger;
  ml?: SetupPlugins['ml'];
  eventsTelemetry?: ITelemetryEventsSender | undefined;
  version: string;
}
