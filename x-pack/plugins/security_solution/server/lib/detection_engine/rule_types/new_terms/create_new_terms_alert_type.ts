/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject } from 'lodash';

import { NEW_TERMS_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { RULE_MANAGEMENT_FEATURE_ID } from '@kbn/security-solution-features/src/constants';
import { SERVER_APP_ID } from '../../../../../common/constants';

import { NewTermsRuleParams } from '../../rule_schema';
import type { CreateRuleOptions, SecurityAlertType } from '../types';
import { singleSearchAfter } from '../utils/single_search_after';
import { getFilter } from '../utils/get_filter';
import { wrapNewTermsAlerts } from './wrap_new_terms_alerts';
import type { EventsAndTerms } from './wrap_new_terms_alerts';
import type {
  RecentTermsAggResult,
  DocFetchAggResult,
  NewTermsAggResult,
  CreateAlertsHook,
} from './build_new_terms_aggregation';
import {
  buildRecentTermsAgg,
  buildNewTermsAgg,
  buildDocFetchAgg,
} from './build_new_terms_aggregation';
import { validateIndexPatterns } from '../utils';
import { parseDateString, validateHistoryWindowStart, transformBucketsToValues } from './utils';
import {
  addToSearchAfterReturn,
  createSearchAfterReturnType,
  getUnprocessedExceptionsWarnings,
  getMaxSignalsWarning,
} from '../utils/utils';
import { createEnrichEventsFunction } from '../utils/enrichments';
import { multiTermsComposite } from './multi_terms_composite';

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
          const validated = NewTermsRuleParams.parse(object);
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
    schemas: {
      params: { type: 'zod', schema: NewTermsRuleParams },
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
    category: DEFAULT_APP_CATEGORIES.security.id,
    producer: RULE_MANAGEMENT_FEATURE_ID,
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
          alertTimestampOverride,
          publicBaseUrl,
          inputIndexFields,
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

      const filterArgs = {
        filters: params.filters,
        index: inputIndex,
        language: params.language,
        savedId: undefined,
        services,
        type: params.type,
        query: params.query,
        exceptionFilter,
        fields: inputIndexFields,
      };
      const esFilter = await getFilter(filterArgs);

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
      while (result.createdSignalsCount <= params.maxSignals) {
        // PHASE 1: Fetch a page of terms using a composite aggregation. This will collect a page from
        // all of the terms seen over the last rule interval. In the next phase we'll determine which
        // ones are new.
        const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
          aggregations: buildRecentTermsAgg({
            fields: params.newTermsFields,
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

        // If the aggregation returns no after_key it signals that we've paged through all results
        // and the current page is empty so we can immediately break.
        if (searchResultWithAggs.aggregations.new_terms.after_key == null) {
          break;
        }
        const bucketsForField = searchResultWithAggs.aggregations.new_terms.buckets;

        const createAlertsHook: CreateAlertsHook = async (aggResult) => {
          const eventsAndTerms: EventsAndTerms[] = (
            aggResult?.aggregations?.new_terms.buckets ?? []
          ).map((bucket) => {
            const newTerms = isObject(bucket.key) ? Object.values(bucket.key) : [bucket.key];
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

          return bulkCreateResult;
        };

        // separate route for multiple new terms
        // it uses paging through composite aggregation
        if (params.newTermsFields.length > 1) {
          await multiTermsComposite({
            filterArgs,
            buckets: bucketsForField,
            params,
            aggregatableTimestampField,
            parsedHistoryWindowSize,
            services,
            result,
            logger,
            runOpts: execOptions.runOpts,
            afterKey,
            createAlertsHook,
          });
        } else {
          // PHASE 2: Take the page of results from Phase 1 and determine if each term exists in the history window.
          // The aggregation filters out buckets for terms that exist prior to `tuple.from`, so the buckets in the
          // response correspond to each new term.
          const includeValues = transformBucketsToValues(params.newTermsFields, bucketsForField);
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

            const bulkCreateResult = await createAlertsHook(docFetchResultWithAggs);

            if (bulkCreateResult.alertsWereTruncated) {
              result.warningMessages.push(getMaxSignalsWarning());
              break;
            }
          }
        }

        afterKey = searchResultWithAggs.aggregations.new_terms.after_key;
      }
      return { ...result, state };
    },
  };
};
