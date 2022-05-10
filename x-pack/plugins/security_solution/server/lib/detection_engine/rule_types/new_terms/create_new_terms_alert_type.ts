/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
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
  InitialNewTermsAggregationResult,
} from './build_new_terms_aggregation';
import { buildTimeRangeFilter } from '../../signals/build_events_query';
import { makeFloatString } from '../../signals/utils';

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

        // For each bucket in the composite agg response, make a query that will find only docs in that bucket
        // *older* than the current rule interval
        const msearchRequest = bucketsForField.flatMap((bucket) => {
          return [
            {},
            {
              size: 0,
              query: {
                bool: {
                  filter: [
                    ...Object.entries(bucket.key).map(([key, value]) => {
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
                    filter,
                    buildTimeRangeFilter({
                      // Looks weird, but is correct: the `from` date of the rule interval becomes the `to` date
                      // when searching the history
                      to: tuple.from.toISOString(),
                      from: parsedHistoryWindowSize.toISOString(),
                      timestampOverride: params.timestampOverride,
                    }),
                  ],
                },
              },
            },
          ];
        });

        const msearchStart = performance.now();
        const msearchResponse = await services.scopedClusterClient.asCurrentUser.msearch({
          index: inputIndex,
          searches: msearchRequest,
        });
        const msearchEnd = performance.now();

        logger.debug(
          `Time spent on history msearch: ${makeFloatString(msearchEnd - msearchStart)}`
        );

        // Filter the buckets down to the set of buckets that can't be found in historical data, i.e.
        // the msearch returned no results
        // TODO: log an error if at least one response has no hits property
        const filteredBuckets = bucketsForField.filter((_, i) => {
          const response = msearchResponse.responses[i];
          if ('hits' in response) {
            return (
              (typeof response.hits.total === 'number' && response.hits.total === 0) ||
              (typeof response.hits.total === 'object' && response.hits.total.value === 0)
            );
          } else {
            return false;
          }
        });

        if (filteredBuckets.length > 0) {
          const sort: estypes.Sort = [];
          if (params.timestampOverride) {
            sort.push({
              [params.timestampOverride]: {
                order: 'asc',
                unmapped_type: 'date',
              },
            });
          }
          sort.push({
            '@timestamp': {
              order: 'asc',
              unmapped_type: 'date',
            },
          });
          const docFields = [
            {
              field: '@timestamp',
              format: 'strict_date_optional_time',
            },
          ];
          if (params.timestampOverride) {
            docFields.push({
              field: params.timestampOverride,
              format: 'strict_date_optional_time',
            });
          }
          const documentFetchMsearch = filteredBuckets.flatMap((bucket) => {
            return [
              {},
              {
                size: 1,
                sort,
                fields: [
                  {
                    field: '*',
                    include_unmapped: true,
                  },
                  ...docFields,
                ],
                query: {
                  bool: {
                    filter: [
                      ...Object.entries(bucket.key).map(([key, value]) => {
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
                      filter,
                      buildTimeRangeFilter({
                        to: tuple.to.toISOString(),
                        from: tuple.from.toISOString(),
                        timestampOverride: params.timestampOverride,
                      }),
                    ],
                  },
                },
              },
            ];
          });
          const docmsearchStart = performance.now();
          const documentsMsearchResponse = await services.scopedClusterClient.asCurrentUser.msearch(
            {
              index: inputIndex,
              searches: documentFetchMsearch,
            }
          );
          const docmsearchEnd = performance.now();
          logger.debug(
            `Time spent on doc fetch msearch: ${makeFloatString(docmsearchEnd - docmsearchStart)}`
          );

          const eventsAndTerms = filteredBuckets
            .map((bucket, i) => {
              const response = documentsMsearchResponse.responses[i];
              if ('hits' in response) {
                return {
                  newTerms: Object.values(bucket.key),
                  event: response.hits.hits[0],
                };
              } else {
                // TODO: log an error if at least one response has no hits property
                return undefined;
              }
            })
            .filter((eventAndTerms): eventAndTerms is EventsAndTerms => eventAndTerms != null);

          // Wrap all candidate alerts - potentially up to a full page from the initial composite agg -
          // and hand them off to bulkCreate to write the docs
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
