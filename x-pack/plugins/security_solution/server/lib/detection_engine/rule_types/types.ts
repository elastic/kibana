/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';

import type { Logger } from '@kbn/logging';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { RuleExecutorOptions, RuleType } from '@kbn/alerting-plugin/server';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeState,
  WithoutReservedActionGroups,
} from '@kbn/alerting-plugin/common';
import type { ListClient } from '@kbn/lists-plugin/server';
import type {
  PersistenceServices,
  IRuleDataClient,
  IRuleDataReader,
} from '@kbn/rule-registry-plugin/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';

import type { Filter } from '@kbn/es-query';
import type { ConfigType } from '../../../config';
import type { SetupPlugins } from '../../../plugin';
import type { CompleteRule, RuleParams } from '../rule_schema';
import type {
  BulkCreate,
  SearchAfterAndBulkCreateReturnType,
  WrapHits,
  WrapSequences,
} from '../signals/types';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import type { ITelemetryEventsSender } from '../../telemetry/sender';
import type { IRuleExecutionLogForExecutors, IRuleExecutionLogService } from '../rule_monitoring';

export interface SecurityAlertTypeReturnValue<TState extends RuleTypeState> {
  bulkCreateTimes: string[];
  enrichmentTimes: string[];
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
  completeRule: CompleteRule<TParams>;
  tuple: {
    to: Moment;
    from: Moment;
    maxSignals: number;
  };
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  listClient: ListClient;
  searchAfterSize: number;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  wrapSequences: WrapSequences;
  ruleDataReader: IRuleDataReader;
  inputIndex: string[];
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  aggregatableTimestampField: string;
  unprocessedExceptions: ExceptionListItemSchema[];
  exceptionFilter: Filter | undefined;
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
  ruleExecutionLoggerFactory: IRuleExecutionLogService['createClientForExecutors'];
  version: string;
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

export interface CreateQueryRuleAdditionalOptions {
  osqueryCreateAction: SetupPlugins['osquery']['osqueryCreateAction'];
  licensing: LicensingPluginSetup;
}

export interface CreateQueryRuleOptions
  extends CreateRuleOptions,
    CreateQueryRuleAdditionalOptions {}
