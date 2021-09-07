/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import { SavedObject } from 'src/core/types';

import { SearchHit } from '@elastic/elasticsearch/api/types';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../../alerting/server';
import { hasLargeValueItem } from '../../../../../common/detection_engine/utils';
import { ThresholdRuleParams } from '../../schemas/rule_schemas';
import { getFilter } from '../get_filter';
import { getInputIndex } from '../get_input_output_index';
import {
  bulkCreateThresholdSignals,
  findThresholdSignals,
  getThresholdBucketFilters,
} from '../threshold';
import {
  AlertAttributes,
  BulkCreate,
  RuleRangeTuple,
  SearchAfterAndBulkCreateReturnType,
  SignalSource,
  ThresholdAlertState,
  WrapHits,
} from '../types';
import {
  createSearchAfterReturnType,
  createSearchAfterReturnTypeFromResponse,
  mergeReturns,
} from '../utils';
import { BuildRuleMessage } from '../rule_messages';
import { ExperimentalFeatures } from '../../../../../common/experimental_features';
import { buildThresholdSignalHistory } from '../threshold/build_signal_history';

export const thresholdExecutor = async ({
  rule,
  tuple,
  exceptionItems,
  experimentalFeatures,
  services,
  version,
  logger,
  buildRuleMessage,
  startedAt,
  state,
  bulkCreate,
  wrapHits,
}: {
  rule: SavedObject<AlertAttributes<ThresholdRuleParams>>;
  tuple: RuleRangeTuple;
  exceptionItems: ExceptionListItemSchema[];
  experimentalFeatures: ExperimentalFeatures;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
  logger: Logger;
  buildRuleMessage: BuildRuleMessage;
  startedAt: Date;
  state: ThresholdAlertState;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
}): Promise<SearchAfterAndBulkCreateReturnType & { state: ThresholdAlertState }> => {
  let result = createSearchAfterReturnType();
  const ruleParams = rule.attributes.params;

  const { signalHistory: thresholdSignalHistory } = state;
  // TODO: clean up any signal history that has fallen outside the window
  // TODO: handle case where we have no signal history? (upgrades)

  if (hasLargeValueItem(exceptionItems)) {
    result.warningMessages.push(
      'Exceptions that use "is in list" or "is not in list" operators are not applied to Threshold rules'
    );
    result.warning = true;
  }
  const inputIndex = await getInputIndex({
    experimentalFeatures,
    services,
    version,
    index: ruleParams.index,
  });

  const bucketFilters = await getThresholdBucketFilters({
    thresholdSignalHistory,
    timestampOverride: ruleParams.timestampOverride,
  });

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

  const {
    searchResult: thresholdResults,
    searchErrors,
    searchDuration: thresholdSearchDuration,
  } = await findThresholdSignals({
    inputIndexPattern: inputIndex,
    from: tuple.from.toISOString(),
    to: tuple.to.toISOString(),
    services,
    logger,
    filter: esFilter,
    threshold: ruleParams.threshold,
    timestampOverride: ruleParams.timestampOverride,
    buildRuleMessage,
  });

  const {
    success,
    bulkCreateDuration,
    createdItemsCount,
    createdItems,
    errors,
  } = await bulkCreateThresholdSignals({
    someResult: thresholdResults,
    ruleSO: rule,
    filter: esFilter,
    services,
    logger,
    inputIndexPattern: inputIndex,
    signalsIndex: ruleParams.outputIndex,
    startedAt,
    from: tuple.from.toDate(),
    thresholdSignalHistory,
    bulkCreate,
    wrapHits,
  });

  result = mergeReturns([
    result,
    createSearchAfterReturnTypeFromResponse({
      searchResult: thresholdResults,
      timestampOverride: ruleParams.timestampOverride,
    }),
    createSearchAfterReturnType({
      success,
      errors: [...errors, ...searchErrors],
      createdSignalsCount: createdItemsCount,
      createdSignals: createdItems,
      bulkCreateTimes: bulkCreateDuration ? [bulkCreateDuration] : [],
      searchAfterTimes: [thresholdSearchDuration],
    }),
  ]);

  return {
    ...result,
    state: {
      ...state,
      signalHistory: await buildThresholdSignalHistory({
        alerts: result.createdSignals as Array<SearchHit<SignalSource>>,
        bucketByFields: ruleParams.threshold.field,
      }),
    },
  };
};
