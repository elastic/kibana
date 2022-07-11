/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import dateMath from '@elastic/datemath';
import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { NEW_TERMS_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../common/constants';

import type { NewTermsRuleParams } from '../../schemas/rule_schemas';
import { newTermsRuleParams } from '../../schemas/rule_schemas';
import type { CreateRuleOptions, SecurityAlertType } from '../types';
import { singleSearchAfter } from '../../signals/single_search_after';
import { getFilter } from '../../signals/get_filter';
import type { GenericBulkCreateResponse } from '../factories';
import type { BaseFieldsLatest } from '../../../../../common/detection_engine/schemas/alerts';
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
import {
  buildTimestampRuntimeMapping,
  TIMESTAMP_RUNTIME_FIELD,
} from './build_timestamp_runtime_mapping';
import type { SignalSource } from '../../signals/types';

interface BulkCreateResults {
  bulkCreateTimes: string[];
  createdSignalsCount: number;
  createdSignals: unknown[];
  success: boolean;
  errors: string[];
  truncatedAlertsArray: boolean;
}

interface SearchAfterResults {
  searchDurations: string[];
  searchErrors: string[];
}

const addBulkCreateResults = (
  results: BulkCreateResults,
  newResults: GenericBulkCreateResponse<BaseFieldsLatest>
): BulkCreateResults => {
  return {
    bulkCreateTimes: [...results.bulkCreateTimes, newResults.bulkCreateDuration],
    createdSignalsCount: results.createdSignalsCount + newResults.createdItemsCount,
    createdSignals: [...results.createdSignals, ...newResults.createdItems],
    success: results.success && newResults.success,
    errors: [...results.errors, ...newResults.errors],
    truncatedAlertsArray: results.truncatedAlertsArray || newResults.truncatedAlertsArray,
  };
};

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
          return validated;
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
          buildRuleMessage,
          bulkCreate,
          completeRule,
          exceptionItems,
          tuple,
          mergeStrategy,
          inputIndex,
          runtimeMappings,
        },
        services,
        params,
        spaceId,
      } = execOptions;

      const filter = await getFilter({
        filters: params.filters,
        index: inputIndex,
        language: params.language,
        savedId: undefined,
        services,
        type: params.type,
        query: params.query,
        lists: exceptionItems,
      });

      const parsedHistoryWindowSize = dateMath.parse(params.historyWindowStart, {
        forceNow: tuple.to.toDate(),
      });
      if (parsedHistoryWindowSize == null) {
        throw Error(`Failed to parse 'historyWindowStart'`);
      }

      let afterKey;
      let bulkCreateResults: BulkCreateResults = {
        bulkCreateTimes: [],
        createdSignalsCount: 0,
        createdSignals: [],
        success: true,
        errors: [],
        truncatedAlertsArray: false,
      };

      const searchAfterResults: SearchAfterResults = {
        searchDurations: [],
        searchErrors: [],
      };

      // If we have a timestampOverride, we'll compute a runtime field that emits the override for each document if it exists,
      // otherwise it emits @timestamp. If we don't have a timestamp override we don't want to pay the cost of using a
      // runtime field, so we just use @timestamp directly.
      const { timestampField, timestampRuntimeMappings } = params.timestampOverride
        ? {
            timestampField: TIMESTAMP_RUNTIME_FIELD,
            timestampRuntimeMappings: buildTimestampRuntimeMapping({
              timestampOverride: params.timestampOverride,
            }),
          }
        : { timestampField: '@timestamp', timestampRuntimeMappings: undefined };

      // There are 2 conditions that mean we're finished: either there were still too many alerts to create
      // after deduplication and the array of alerts was truncated before being submitted to ES, or there were
      // exactly enough new alerts to hit maxSignals without truncating the array of alerts. We check both because
      // it's possible for the array to be truncated but alert documents could fail to be created for other reasons,
      // in which case createdSignalsCount would still be less than maxSignals. Since valid alerts were truncated from
      // the array in that case, we stop and report the errors.
      while (
        !bulkCreateResults.truncatedAlertsArray &&
        bulkCreateResults.createdSignalsCount < params.maxSignals
      ) {
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
          filter,
          logger,
          pageSize: 0,
          timestampOverride: params.timestampOverride,
          buildRuleMessage,
          runtimeMappings,
        });
        const searchResultWithAggs = searchResult as RecentTermsAggResult;
        if (!searchResultWithAggs.aggregations) {
          throw new Error('expected to find aggregations on search result');
        }
        logger.debug(`Time spent on composite agg: ${searchDuration}`);

        searchAfterResults.searchDurations.push(searchDuration);
        searchAfterResults.searchErrors.push(...searchErrors);

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
            timestampField,
            field: params.newTermsFields[0],
            include: includeValues,
          }),
          runtimeMappings: {
            ...runtimeMappings,
            ...timestampRuntimeMappings,
          },
          searchAfterSortIds: undefined,
          index: inputIndex,
          // For Phase 2, we expand the time range to aggregate over the history window
          // in addition to the rule interval
          from: parsedHistoryWindowSize.toISOString(),
          to: tuple.to.toISOString(),
          services,
          filter,
          logger,
          pageSize: 0,
          timestampOverride: params.timestampOverride,
          buildRuleMessage,
        });
        searchAfterResults.searchDurations.push(pageSearchDuration);
        searchAfterResults.searchErrors.push(...pageSearchErrors);

        logger.debug(`Time spent on phase 2 terms agg: ${pageSearchDuration}`);

        const pageSearchResultWithAggs = pageSearchResult as NewTermsAggResult;
        if (!pageSearchResultWithAggs.aggregations) {
          throw new Error('expected to find aggregations on page search result');
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
              timestampField,
              field: params.newTermsFields[0],
              include: actualNewTerms,
            }),
            runtimeMappings: {
              ...runtimeMappings,
              ...timestampRuntimeMappings,
            },
            searchAfterSortIds: undefined,
            index: inputIndex,
            // For phase 3, we go back to aggregating only over the rule interval - excluding the history window
            from: tuple.from.toISOString(),
            to: tuple.to.toISOString(),
            services,
            filter,
            logger,
            pageSize: 0,
            timestampOverride: params.timestampOverride,
            buildRuleMessage,
          });
          searchAfterResults.searchDurations.push(docFetchSearchDuration);
          searchAfterResults.searchErrors.push(...docFetchSearchErrors);

          const docFetchResultWithAggs = docFetchSearchResult as DocFetchAggResult;

          if (!docFetchResultWithAggs.aggregations) {
            throw new Error('expected to find aggregations on page search result');
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
            params.maxSignals - bulkCreateResults.createdSignalsCount
          );

          bulkCreateResults = addBulkCreateResults(bulkCreateResults, bulkCreateResult);
        }
      }

      return {
        // If an error occurs but doesn't cause us to throw then we still count the execution as a success.
        // Should be refactored for better clarity, but that's how it is for now.
        success: true,
        warning: false,
        searchAfterTimes: searchAfterResults.searchDurations,
        bulkCreateTimes: bulkCreateResults.bulkCreateTimes,
        lastLookBackDate: undefined,
        createdSignalsCount: bulkCreateResults.createdSignalsCount,
        createdSignals: bulkCreateResults.createdSignals,
        errors: [...searchAfterResults.searchErrors, ...bulkCreateResults.errors],
        warningMessages: [],
        state: {},
      };
    },
  };
};
