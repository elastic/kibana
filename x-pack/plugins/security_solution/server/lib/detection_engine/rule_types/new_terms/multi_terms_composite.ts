/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pRetry from 'p-retry';
import type { Moment } from 'moment';
import type { Logger } from '@kbn/logging';
import type { NewTermsRuleParams } from '../../rule_schema';
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
  CreateAlertsHook,
} from './build_new_terms_aggregation';

import { getMaxSignalsWarning } from '../utils/utils';

import type { RuleServices, SearchAfterAndBulkCreateReturnType, RunOpts } from '../types';

/**
 * composite aggregation page batch size set to 500 as it shows th best performance(refer https://github.com/elastic/kibana/pull/157413) and
 * allows to be scaled down below when max_clause_count error is encountered
 */
const BATCH_SIZE = 500;

interface MultiTermsCompositeArgsBase {
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
  runOpts: RunOpts<NewTermsRuleParams>;
  afterKey: Record<string, string | number | null> | undefined;
  createAlertsHook: CreateAlertsHook;
}

interface MultiTermsCompositeArgs extends MultiTermsCompositeArgsBase {
  batchSize: number;
}

/**
 * This helper does phase2/phase3(look README) got multiple new terms
 * It takes full page of results from phase 1 (10,000)
 * Splits it in chunks (starts from 500) and applies it as a filter in new composite aggregation request
 * It pages through though all 10,000 results from phase1 until maxSize alerts found
 */
const multiTermsCompositeNonRetryable = async ({
  filterArgs,
  buckets,
  params,
  aggregatableTimestampField,
  parsedHistoryWindowSize,
  services,
  result,
  logger,
  runOpts,
  afterKey,
  createAlertsHook,
  batchSize,
}: MultiTermsCompositeArgs) => {
  const {
    ruleExecutionLogger,
    tuple,
    inputIndex,
    runtimeMappings,
    primaryTimestamp,
    secondaryTimestamp,
  } = runOpts;

  let internalAfterKey = afterKey ?? undefined;

  let i = 0;

  while (i < buckets.length) {
    const batch = buckets.slice(i, i + batchSize);
    i += batchSize;
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

    // PHASE 2: Take the page of results from Phase 1 and determine if each term exists in the history window.
    // The aggregation filters out buckets for terms that exist prior to `tuple.from`, so the buckets in the
    // response correspond to each new term.
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
        pageSize: batchSize,
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
          pageSize: batchSize,
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

      const bulkCreateResult = await createAlertsHook(docFetchResultWithAggs);

      if (bulkCreateResult.alertsWereTruncated) {
        result.warningMessages.push(getMaxSignalsWarning());
        return result;
      }
    }

    internalAfterKey = batch[batch.length - 1]?.key;
  }

  return result;
};

/**
 * If request fails with batch size of BATCH_SIZE
 * We will try to reduce it in twice per each request, three times, up until 125
 * Per ES documentation, max_clause_count min value is 1,000 - so with 125 we should be able execute query below max_clause_count value
 */
export const multiTermsComposite = async (args: MultiTermsCompositeArgsBase): Promise<void> => {
  let retryBatchSize = BATCH_SIZE;
  const ruleExecutionLogger = args.runOpts.ruleExecutionLogger;
  await pRetry(
    async (retryCount) => {
      try {
        const res = await multiTermsCompositeNonRetryable({ ...args, batchSize: retryBatchSize });
        return res;
      } catch (e) {
        // do not retry if error not related to too many clauses
        // if user's configured rule somehow has filter itself greater than max_clause_count, we won't get to this place anyway,
        // as rule would fail on phase 1
        if (
          ![
            'query_shard_exception: failed to create query',
            'Query contains too many nested clauses;',
          ].some((errMessage) => e.message.includes(errMessage))
        ) {
          args.result.errors.push(e.message);
          return args.result;
        }

        retryBatchSize = retryBatchSize / 2;
        ruleExecutionLogger.warn(
          `New terms query for multiple fields failed due to too many clauses in query: ${e.message}. Retrying #${retryCount} with ${retryBatchSize} for composite aggregation`
        );
        throw e;
      }
    },
    {
      retries: 2,
    }
  );
};
