/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { NEW_TERMS_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../common/constants';

import type { NewTermsRuleParams } from '../../rule_schema';
import { newTermsRuleParams } from '../../rule_schema';
import type { CreateRuleOptions, SecurityAlertType } from '../types';
import { singleSearchAfter } from '../../signals/single_search_after';
import { getFilter } from '../../signals/get_filter';
import { wrapNewTermsAlerts } from '../factories/utils/wrap_new_terms_alerts';
import type {
  DocFetchAggResult,
  RecentTermsAggResult,
  NewTermsAggResult,
} from './build_new_terms_aggregation';
import {
  buildDocFetchAgg,
  buildRecentTermsAgg,
  buildNewTermsAgg,
} from './build_new_terms_aggregation';
import type { SignalSource } from '../../signals/types';
import { validateIndexPatterns } from '../utils';
import { parseDateString, validateHistoryWindowStart } from './utils';
import {
  addToSearchAfterReturn,
  createSearchAfterReturnType,
  getUnprocessedExceptionsWarnings,
} from '../../signals/utils';
import { createEnrichEventsFunction } from '../../signals/enrichments';

export const createNewTermsAlertType = (
  createOptions: CreateRuleOptions
): SecurityAlertType<NewTermsRuleParams, {}, {}, 'default'> => {
  const { logger } = createOptions;
  return {
    id: NEW_TERMS_RULE_TYPE_ID,
    name: 'New Terms Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          const [validated, errors] = validateNonExact(object, newTermsRuleParams);
          if (errors != null) {
            throw new Error(errors);
          }
          if (validated == null) {
            throw new Error('Validation of rule params failed');
          }
          validateHistoryWindowStart({
            historyWindowStart: validated.historyWindowStart,
            from: validated.from,
          });
          return validated;
        },
        /**
         * validate rule params when rule is bulk edited (update and created in future as well)
         * returned params can be modified (useful in case of version increment)
         * @param mutatedRuleParams
         * @returns mutatedRuleParams
         */
        validateMutatedParams: (mutatedRuleParams) => {
          validateIndexPatterns(mutatedRuleParams.index);

          return mutatedRuleParams;
        },
      },
    },
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    actionVariables: {
      context: [{ name: 'server', description: 'the server' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: false,
    producer: SERVER_APP_ID,
    async executor(execOptions) {
      const {
        runOpts: {
          ruleExecutionLogger,
          bulkCreate,
          completeRule,
          tuple,
          mergeStrategy,
          inputIndex,
          runtimeMappings,
          primaryTimestamp,
          secondaryTimestamp,
          aggregatableTimestampField,
          exceptionFilter,
          unprocessedExceptions,
        },
        services,
        params,
        spaceId,
        state,
      } = execOptions;

      // Validate the history window size compared to `from` at runtime as well as in the `validate`
      // function because rule preview does not use the `validate` function defined on the rule type
      validateHistoryWindowStart({
        historyWindowStart: params.historyWindowStart,
        from: params.from,
      });

      const esFilter = await getFilter({
        filters: params.filters,
        index: inputIndex,
        language: params.language,
        savedId: undefined,
        services,
        type: params.type,
        query: params.query,
        exceptionFilter,
      });

      const parsedHistoryWindowSize = parseDateString({
        date: params.historyWindowStart,
        forceNow: tuple.to.toDate(),
        name: 'historyWindowStart',
      });

      let afterKey;

      const result = createSearchAfterReturnType();

      const exceptionsWarning = getUnprocessedExceptionsWarnings(unprocessedExceptions);
      if (exceptionsWarning) {
        result.warningMessages.push(exceptionsWarning);
      }

      // There are 2 conditions that mean we're finished: either there were still too many alerts to create
      // after deduplication and the array of alerts was truncated before being submitted to ES, or there were
      // exactly enough new alerts to hit maxSignals without truncating the array of alerts. We check both because
      // it's possible for the array to be truncated but alert documents could fail to be created for other reasons,
      // in which case createdSignalsCount would still be less than maxSignals. Since valid alerts were truncated from
      // the array in that case, we stop and report the errors.
      while (result.createdSignalsCount < params.maxSignals) {
        // PHASE 1: Fetch a page of terms using a composite aggregation. This will collect a page from
        // all of the terms seen over the last rule interval. In the next phase we'll determine which
        // ones are new.
        const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
          aggregations: buildRecentTermsAgg({
            field: params.newTermsFields[0],
            after: afterKey,
          }),
          searchAfterSortIds: undefined,
          index: inputIndex,
          // The time range for the initial composite aggregation is the rule interval, `from` and `to`
          from: tuple.from.toISOString(),
          to: tuple.to.toISOString(),
          services,
          ruleExecutionLogger,
          filter: esFilter,
          pageSize: 0,
          primaryTimestamp,
          secondaryTimestamp,
          runtimeMappings,
        });
        const searchResultWithAggs = searchResult as RecentTermsAggResult;
        if (!searchResultWithAggs.aggregations) {
          throw new Error('Aggregations were missing on recent terms search result');
        }
        logger.debug(`Time spent on composite agg: ${searchDuration}`);

        result.searchAfterTimes.push(searchDuration);
        result.errors.push(...searchErrors);

        afterKey = searchResultWithAggs.aggregations.new_terms.after_key;

        // If the aggregation returns no after_key it signals that we've paged through all results
        // and the current page is empty so we can immediately break.
        if (afterKey == null) {
          break;
        }
        const bucketsForField = searchResultWithAggs.aggregations.new_terms.buckets;
        const includeValues = bucketsForField
          .map((bucket) => Object.values(bucket.key)[0])
          .filter((value): value is string | number => value != null);

        // PHASE 2: Take the page of results from Phase 1 and determine if each term exists in the history window.
        // The aggregation filters out buckets for terms that exist prior to `tuple.from`, so the buckets in the
        // response correspond to each new term.
        const {
          searchResult: pageSearchResult,
          searchDuration: pageSearchDuration,
          searchErrors: pageSearchErrors,
        } = await singleSearchAfter({
          aggregations: buildNewTermsAgg({
            newValueWindowStart: tuple.from,
            timestampField: aggregatableTimestampField,
            field: params.newTermsFields[0],
            include: includeValues,
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
          filter: esFilter,
          pageSize: 0,
          primaryTimestamp,
          secondaryTimestamp,
        });
        result.searchAfterTimes.push(pageSearchDuration);
        result.errors.push(...pageSearchErrors);

        logger.debug(`Time spent on phase 2 terms agg: ${pageSearchDuration}`);

        const pageSearchResultWithAggs = pageSearchResult as NewTermsAggResult;
        if (!pageSearchResultWithAggs.aggregations) {
          throw new Error('Aggregations were missing on new terms search result');
        }

        // PHASE 3: For each term that is not in the history window, fetch the oldest document in
        // the rule interval for that term. This is the first document to contain the new term, and will
        // become the basis of the resulting alert.
        // One document could become multiple alerts if the document contains an array with multiple new terms.
        if (pageSearchResultWithAggs.aggregations.new_terms.buckets.length > 0) {
          const actualNewTerms = pageSearchResultWithAggs.aggregations.new_terms.buckets.map(
            (bucket) => bucket.key
          );

          const {
            searchResult: docFetchSearchResult,
            searchDuration: docFetchSearchDuration,
            searchErrors: docFetchSearchErrors,
          } = await singleSearchAfter({
            aggregations: buildDocFetchAgg({
              timestampField: aggregatableTimestampField,
              field: params.newTermsFields[0],
              include: actualNewTerms,
            }),
            runtimeMappings,
            searchAfterSortIds: undefined,
            index: inputIndex,
            // For phase 3, we go back to aggregating only over the rule interval - excluding the history window
            from: tuple.from.toISOString(),
            to: tuple.to.toISOString(),
            services,
            ruleExecutionLogger,
            filter: esFilter,
            pageSize: 0,
            primaryTimestamp,
            secondaryTimestamp,
          });
          result.searchAfterTimes.push(docFetchSearchDuration);
          result.errors.push(...docFetchSearchErrors);

          const docFetchResultWithAggs = docFetchSearchResult as DocFetchAggResult;

          if (!docFetchResultWithAggs.aggregations) {
            throw new Error('Aggregations were missing on document fetch search result');
          }

          const eventsAndTerms: Array<{
            event: estypes.SearchHit<SignalSource>;
            newTerms: Array<string | number | null>;
          }> = docFetchResultWithAggs.aggregations.new_terms.buckets.map((bucket) => ({
            event: bucket.docs.hits.hits[0],
            newTerms: [bucket.key],
          }));

          const wrappedAlerts = wrapNewTermsAlerts({
            eventsAndTerms,
            spaceId,
            completeRule,
            mergeStrategy,
            indicesToQuery: inputIndex,
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
            break;
          }
        }
      }
      return { ...result, state };
    },
  };
};
