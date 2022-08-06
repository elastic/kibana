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
import { hasLargeValueItem } from '../../../../../common/detection_engine/utils';
import type { CompleteRule, ThresholdRuleParams } from '../../schemas/rule_schemas';
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
import { createSearchAfterReturnType } from '../utils';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import { buildThresholdSignalHistory } from '../threshold/build_signal_history';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';

export const thresholdExecutor = async ({
  inputIndex,
  runtimeMappings,
  completeRule,
  tuple,
  exceptionItems,
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
}: {
  inputIndex: string[];
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  completeRule: CompleteRule<ThresholdRuleParams>;
  tuple: RuleRangeTuple;
  exceptionItems: ExceptionListItemSchema[];
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
}): Promise<SearchAfterAndBulkCreateReturnType & { state: ThresholdAlertState }> => {
  let result = createSearchAfterReturnType();
  const ruleParams = completeRule.ruleParams;

  return withSecuritySpan('thresholdExecutor', async () => {
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

    if (hasLargeValueItem(exceptionItems)) {
      result.warningMessages.push(
        'Exceptions that use "is in list" or "is not in list" operators are not applied to Threshold rules'
      );
      result.warning = true;
    }

    // Eliminate dupes
    const bucketFilters = await getThresholdBucketFilters({
      signalHistory,
      primaryTimestamp,
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
      lists: exceptionItems,
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
    });

    // Build and index new alerts
    const { success, bulkCreateDuration, createdItemsCount, createdItems, errors } =
      await bulkCreateThresholdSignals({
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
      });

    result = {
      ...result,
      success,
      errors: [...errors, ...previousSearchErrors, ...searchErrors],
      createdSignalsCount: createdItemsCount,
      createdSignals: createdItems,
      bulkCreateTimes: bulkCreateDuration ? [bulkCreateDuration] : [],
      searchAfterTimes: searchDurations,
    };

    const createdAlerts = createdItems.map((alert) => {
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
