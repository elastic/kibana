/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { chunk } from 'lodash';
import { performance } from 'perf_hooks';
import dateMath from '@elastic/datemath';
import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { NEW_TERMS_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../common/constants';

import { newTermsRuleParams, NewTermsRuleParams } from '../../schemas/rule_schemas';
import { CreateRuleOptions, SecurityAlertType } from '../types';
import { getInputIndex } from '../../signals/get_input_output_index';
import { singleSearchAfter } from '../../signals/single_search_after';
import { getFilter } from '../../signals/get_filter';
import { buildReasonMessageForNewTermsAlert } from '../../signals/reason_formatters';
import { GenericBulkCreateResponse } from '../factories';
import { BaseFieldsLatest } from '../../../../../common/detection_engine/schemas/alerts';
import { EventsAndTerms, wrapNewTermsAlerts } from '../factories/utils/wrap_new_terms_alerts';
import {
  buildInitialNewTermsAggregation,
  buildNewTermsAggregation,
  InitialNewTermsAggregationResult,
  NewTermsAggregationResult,
} from './build_new_terms_aggregation';
import { buildTimeRangeFilter } from '../../signals/build_events_query';
import { makeFloatString } from '../../signals/utils';
import {
  buildTimestampRuntimeMapping,
  TIMESTAMP_RUNTIME_FIELD,
} from './build_timestamp_runtime_mapping';
import { SignalSource } from '../../signals/types';

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
  const { experimentalFeatures, logger, version } = createOptions;
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
        },
        services,
        params,
        spaceId,
      } = execOptions;

      const inputIndex = await getInputIndex({
        experimentalFeatures,
        services,
        version,
        index: params.index,
      });

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
      const { timestampField, runtimeMappings } = params.timestampOverride
        ? {
            timestampField: TIMESTAMP_RUNTIME_FIELD,
            runtimeMappings: buildTimestampRuntimeMapping({
              timestampOverride: params.timestampOverride,
            }),
          }
        : { timestampField: '@timestamp', runtimeMappings: undefined };

      while (
        !bulkCreateResults.truncatedAlertsArray &&
        bulkCreateResults.createdSignalsCount < params.maxSignals
      ) {
        const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
          aggregations: buildInitialNewTermsAggregation({
            field: params.newTermsFields[0],
            after: afterKey,
          }),
          searchAfterSortIds: undefined,
          index: inputIndex,
          from: tuple.from.toISOString(),
          to: tuple.to.toISOString(),
          services,
          filter,
          logger,
          pageSize: 0,
          timestampOverride: params.timestampOverride,
          buildRuleMessage,
        });
        const searchResultWithAggs = searchResult as InitialNewTermsAggregationResult;
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

        const pageFilter = {
          bool: {
            should: bucketsForField.map((bucket) => {
              return {
                bool: {
                  filter: Object.entries(bucket.key).map(([key, value]) => {
                    if (value != null) {
                      return {
                        term: {
                          [key]: value,
                        },
                      };
                    } else {
                      return {
                        bool: {
                          must_not: {
                            exists: {
                              field: key,
                            },
                          },
                        },
                      };
                    }
                  }),
                },
              };
            }),
          },
        };

        const combinedPageFilter = await getFilter({
          filters: params.filters ? [...params.filters, pageFilter] : [pageFilter],
          index: inputIndex,
          language: params.language,
          savedId: undefined,
          services,
          type: params.type,
          query: params.query,
          lists: exceptionItems,
        });

        const {
          searchResult: pageSearchResult,
          searchDuration: pageSearchDuration,
          searchErrors: pageSearchErrors,
        } = await singleSearchAfter({
          aggregations: buildNewTermsAggregation({
            newValueWindowStart: tuple.from,
            timestampField,
            field: params.newTermsFields[0],
            after: undefined,
          }),
          runtimeMappings,
          searchAfterSortIds: undefined,
          index: inputIndex,
          from: parsedHistoryWindowSize.toISOString(),
          to: tuple.to.toISOString(),
          services,
          filter: combinedPageFilter,
          logger,
          pageSize: 0,
          timestampOverride: params.timestampOverride,
          buildRuleMessage,
        });

        logger.debug(`Time spent on page composite agg: ${pageSearchDuration}`);

        const pageSearchResultWithAggs = pageSearchResult as NewTermsAggregationResult;
        if (!pageSearchResultWithAggs.aggregations) {
          throw new Error('expected to find aggregations on page search result');
        }

        const eventsAndTerms: Array<{
          event: estypes.SearchHit<SignalSource>;
          newTerms: Array<string | number | null>;
        }> = [];
        const bucketsForFieldInPage = pageSearchResultWithAggs.aggregations.new_terms.buckets;
        bucketsForFieldInPage.forEach((bucket) => {
          eventsAndTerms.push({
            event: bucket.docs.hits.hits[0],
            newTerms: Object.values(bucket.key),
          });
        });

        const wrappedAlerts = wrapNewTermsAlerts({
          eventsAndTerms,
          spaceId,
          completeRule,
          mergeStrategy,
          buildReasonMessage: buildReasonMessageForNewTermsAlert,
        });

        const bulkCreateResult = await bulkCreate(
          wrappedAlerts,
          params.maxSignals - bulkCreateResults.createdSignalsCount
        );

        bulkCreateResults = addBulkCreateResults(bulkCreateResults, bulkCreateResult);
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
