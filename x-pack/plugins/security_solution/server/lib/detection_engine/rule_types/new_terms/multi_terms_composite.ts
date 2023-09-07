/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import type { Logger } from '@kbn/logging';
import type { NewTermsRuleParams } from '../../rule_schema';
import { wrapNewTermsAlerts } from './wrap_new_terms_alerts';
import type { EventsAndTerms } from './wrap_new_terms_alerts';
import type { GetFilterArgs } from '../utils/get_filter';
import { getFilter } from '../utils/get_filter';
import { singleSearchAfter } from '../utils/single_search_after';
import {
  buildCompositeNewTermsAgg,
  buildCompositeDocFetchAgg,
} from './build_new_terms_aggregation';

import type {
  CompositeDocFetchAggResult,
  CompositeNewTermsAggResult,
} from './build_new_terms_aggregation';

import { addToSearchAfterReturn, getMaxSignalsWarning } from '../utils/utils';
import { createEnrichEventsFunction } from '../utils/enrichments';

import type { RuleServices, SearchAfterAndBulkCreateReturnType, RunOpts } from '../types';
const BATCH_SIZE = 1000;

interface MultiTermsCompositeArgs {
  filterArgs: GetFilterArgs;
  buckets: Array<{
    doc_count: number;
    key: Record<string, string | number | null>;
  }>;
  params: NewTermsRuleParams;
  aggregatableTimestampField: string;
  parsedHistoryWindowSize: Moment;
  services: RuleServices;
  result: SearchAfterAndBulkCreateReturnType;
  logger: Logger;
  spaceId: string;
  runOpts: RunOpts<NewTermsRuleParams>;
  afterKey: Record<string, string | number | null> | undefined;
}

export const multiTermsComposite = async ({
  filterArgs,
  buckets,
  params,
  aggregatableTimestampField,
  parsedHistoryWindowSize,
  services,
  result,
  logger,
  spaceId,
  runOpts,
  afterKey,
}: MultiTermsCompositeArgs) => {
  const {
    ruleExecutionLogger,
    bulkCreate,
    completeRule,
    tuple,
    mergeStrategy,
    inputIndex,
    runtimeMappings,
    primaryTimestamp,
    secondaryTimestamp,
    alertTimestampOverride,
    publicBaseUrl,
  } = runOpts;

  let internalAfterKey = afterKey ?? undefined;

  let i = 0;

  while (i < buckets.length) {
    const batch = buckets.slice(i, i + BATCH_SIZE);
    i += BATCH_SIZE;
    const batchFilters = batch.map((b) => {
      const must = Object.keys(b.key).map((key) => ({ match: { [key]: b.key[key] } }));

      return { bool: { must } };
    });

    const esFilterForBatch = await getFilter({
      ...filterArgs,
      filters: [
        ...(Array.isArray(filterArgs.filters) ? filterArgs.filters : []),
        { bool: { should: batchFilters } },
      ],
    });

    const {
      searchResult: pageSearchResult,
      searchDuration: pageSearchDuration,
      searchErrors: pageSearchErrors,
    } = await singleSearchAfter({
      aggregations: buildCompositeNewTermsAgg({
        newValueWindowStart: tuple.from,
        timestampField: aggregatableTimestampField,
        fields: params.newTermsFields,
        after: internalAfterKey,
        pageSize: BATCH_SIZE,
      }),
      runtimeMappings,
      searchAfterSortIds: undefined,
      index: inputIndex,
      // For Phase 2, we expand the time range to aggregate over the history window
      // in addition to the rule interval
      from: parsedHistoryWindowSize.toISOString(),
      to: tuple.to.toISOString(),
      services,
      ruleExecutionLogger,
      filter: esFilterForBatch,
      pageSize: 0,
      primaryTimestamp,
      secondaryTimestamp,
    });

    result.searchAfterTimes.push(pageSearchDuration);
    result.errors.push(...pageSearchErrors);
    logger.debug(`Time spent on phase 2 terms agg: ${pageSearchDuration}`);

    const pageSearchResultWithAggs = pageSearchResult as CompositeNewTermsAggResult;
    if (!pageSearchResultWithAggs.aggregations) {
      throw new Error('Aggregations were missing on new terms search result');
    }

    // PHASE 3: For each term that is not in the history window, fetch the oldest document in
    // the rule interval for that term. This is the first document to contain the new term, and will
    // become the basis of the resulting alert.
    // One document could become multiple alerts if the document contains an array with multiple new terms.
    if (pageSearchResultWithAggs.aggregations.new_terms.buckets.length > 0) {
      const {
        searchResult: docFetchSearchResult,
        searchDuration: docFetchSearchDuration,
        searchErrors: docFetchSearchErrors,
      } = await singleSearchAfter({
        aggregations: buildCompositeDocFetchAgg({
          newValueWindowStart: tuple.from,
          timestampField: aggregatableTimestampField,
          fields: params.newTermsFields,
          after: internalAfterKey,
          pageSize: BATCH_SIZE,
        }),
        runtimeMappings,
        searchAfterSortIds: undefined,
        index: inputIndex,
        from: parsedHistoryWindowSize.toISOString(),
        to: tuple.to.toISOString(),
        services,
        ruleExecutionLogger,
        filter: esFilterForBatch,
        pageSize: 0,
        primaryTimestamp,
        secondaryTimestamp,
      });
      result.searchAfterTimes.push(docFetchSearchDuration);
      result.errors.push(...docFetchSearchErrors);

      const docFetchResultWithAggs = docFetchSearchResult as CompositeDocFetchAggResult;

      if (!docFetchResultWithAggs.aggregations) {
        throw new Error('Aggregations were missing on document fetch search result');
      }

      const eventsAndTerms: EventsAndTerms[] =
        docFetchResultWithAggs.aggregations.new_terms.buckets.map((bucket) => {
          const newTerms = Object.values(bucket.key);
          return {
            event: bucket.docs.hits.hits[0],
            newTerms,
          };
        });

      const wrappedAlerts = wrapNewTermsAlerts({
        eventsAndTerms,
        spaceId,
        completeRule,
        mergeStrategy,
        indicesToQuery: inputIndex,
        alertTimestampOverride,
        ruleExecutionLogger,
        publicBaseUrl,
      });

      const bulkCreateResult = await bulkCreate(
        wrappedAlerts,
        params.maxSignals - result.createdSignalsCount,
        createEnrichEventsFunction({
          services,
          logger: ruleExecutionLogger,
        })
      );

      addToSearchAfterReturn({ current: result, next: bulkCreateResult });
      if (bulkCreateResult.alertsWereTruncated) {
        result.warningMessages.push(getMaxSignalsWarning());
        return result;
      }
    }

    internalAfterKey = batch[batch.length - 1]?.key;
  }

  return result;
};
