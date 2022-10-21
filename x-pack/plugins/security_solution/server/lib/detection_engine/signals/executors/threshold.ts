/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { IRuleDataReader } from '@kbn/rule-registry-plugin/server';
import type { Filter } from '@kbn/es-query';
import type { CompleteRule, ThresholdRuleParams } from '../../rule_schema';
import { getFilter } from '../get_filter';
import {
  bulkCreateThresholdSignals,
  findThresholdSignals,
  getThresholdBucketFilters,
  getThresholdSignalHistory,
} from '../threshold';
import type {
  BulkCreate,
  RuleRangeTuple,
  SearchAfterAndBulkCreateReturnType,
  ThresholdAlertState,
  WrapHits,
} from '../types';
import {
  addToSearchAfterReturn,
  createSearchAfterReturnType,
  getUnprocessedExceptionsWarnings,
} from '../utils';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import { buildThresholdSignalHistory } from '../threshold/build_signal_history';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';

export const thresholdExecutor = async ({
  inputIndex,
  runtimeMappings,
  completeRule,
  tuple,
  ruleExecutionLogger,
  services,
  version,
  startedAt,
  state,
  bulkCreate,
  wrapHits,
  ruleDataReader,
  primaryTimestamp,
  secondaryTimestamp,
  aggregatableTimestampField,
  exceptionFilter,
  unprocessedExceptions,
}: {
  inputIndex: string[];
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  completeRule: CompleteRule<ThresholdRuleParams>;
  tuple: RuleRangeTuple;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  version: string;
  startedAt: Date;
  state: ThresholdAlertState;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
  ruleDataReader: IRuleDataReader;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  aggregatableTimestampField: string;
  exceptionFilter: Filter | undefined;
  unprocessedExceptions: ExceptionListItemSchema[];
}): Promise<SearchAfterAndBulkCreateReturnType & { state: ThresholdAlertState }> => {
  const result = createSearchAfterReturnType();
  const ruleParams = completeRule.ruleParams;

  return withSecuritySpan('thresholdExecutor', async () => {
    const exceptionsWarning = getUnprocessedExceptionsWarnings(unprocessedExceptions);
    if (exceptionsWarning) {
      result.warningMessages.push(exceptionsWarning);
    }

    // Get state or build initial state (on upgrade)
    const { signalHistory, searchErrors: previousSearchErrors } = state.initialized
      ? { signalHistory: state.signalHistory, searchErrors: [] }
      : await getThresholdSignalHistory({
          from: tuple.from.toISOString(),
          to: tuple.to.toISOString(),
          ruleId: ruleParams.ruleId,
          bucketByFields: ruleParams.threshold.field,
          ruleDataReader,
        });

    if (state.initialized) {
      // Clean up any signal history that has fallen outside the window
      const toDelete: string[] = [];
      for (const [hash, entry] of Object.entries(signalHistory)) {
        if (entry.lastSignalTimestamp < tuple.from.valueOf()) {
          toDelete.push(hash);
        }
      }
      for (const hash of toDelete) {
        delete signalHistory[hash];
      }
    }

    // Eliminate dupes
    const bucketFilters = await getThresholdBucketFilters({
      signalHistory,
      aggregatableTimestampField,
    });

    // Combine dupe filter with other filters
    const esFilter = await getFilter({
      type: ruleParams.type,
      filters: ruleParams.filters ? ruleParams.filters.concat(bucketFilters) : bucketFilters,
      language: ruleParams.language,
      query: ruleParams.query,
      savedId: ruleParams.savedId,
      services,
      index: inputIndex,
      exceptionFilter,
    });

    // Look for new events over threshold
    const { buckets, searchErrors, searchDurations } = await findThresholdSignals({
      inputIndexPattern: inputIndex,
      from: tuple.from.toISOString(),
      to: tuple.to.toISOString(),
      maxSignals: tuple.maxSignals,
      services,
      ruleExecutionLogger,
      filter: esFilter,
      threshold: ruleParams.threshold,
      runtimeMappings,
      primaryTimestamp,
      secondaryTimestamp,
      aggregatableTimestampField,
    });

    // Build and index new alerts

    const createResult = await bulkCreateThresholdSignals({
      buckets,
      completeRule,
      filter: esFilter,
      services,
      inputIndexPattern: inputIndex,
      signalsIndex: ruleParams.outputIndex,
      startedAt,
      from: tuple.from.toDate(),
      signalHistory,
      bulkCreate,
      wrapHits,
      ruleExecutionLogger,
    });

    addToSearchAfterReturn({ current: result, next: createResult });

    result.errors.push(...previousSearchErrors);
    result.errors.push(...searchErrors);
    result.searchAfterTimes = searchDurations;

    const createdAlerts = createResult.createdItems.map((alert) => {
      const { _id, _index, ...source } = alert;
      return {
        _id,
        _index,
        _source: {
          ...source,
        },
      } as SearchHit<unknown>;
    });

    const newSignalHistory = buildThresholdSignalHistory({
      alerts: createdAlerts,
    });

    return {
      ...result,
      state: {
        ...state,
        initialized: true,
        signalHistory: {
          ...signalHistory,
          ...newSignalHistory,
        },
      },
    };
  });
};
