/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Moment } from 'moment';
import dateMath from '@elastic/datemath';
import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { NEW_TERMS_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../common/constants';

import { newTermsRuleParams, NewTermsRuleParams } from '../../schemas/rule_schemas';
import { CreateRuleOptions, SecurityAlertType } from '../types';
import { getInputIndex } from '../../signals/get_input_output_index';
import { singleSearchAfter } from '../../signals/single_search_after';
import { getFilter } from '../../signals/get_filter';
import { ESSearchResponse } from '../../../../../../../../src/core/types/elasticsearch';
import { SignalSource } from '../../signals/types';
import { buildReasonMessageForNewTermsAlert } from '../../signals/reason_formatters';
import { GenericBulkCreateResponse } from '../factories';
import { BaseFieldsLatest } from '../../../../../common/detection_engine/schemas/alerts';
import { wrapNewTermsAlerts } from '../factories/utils/wrap_new_terms_alerts';

interface BulkCreateResults {
  bulkCreateTimes: string[];
  createdSignalsCount: number;
  createdSignals: unknown[];
  success: boolean;
  errors: string[];
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

      const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
        aggregations: buildAggregation({
          newValueWindowStart: tuple.from,
          field: params.newTermsFields[0],
          maxSignals: params.maxSignals,
          timestampOverride: params.timestampOverride,
        }),
        runtimeMappings: buildRuntimeMappings({
          timestampOverride: params.timestampOverride,
        }),
        searchAfterSortIds: undefined,
        index: inputIndex,
        from: parsedHistoryWindowSize.toISOString(),
        to: tuple.to.toISOString(),
        services,
        filter,
        logger,
        pageSize: 0,
        timestampOverride: params.timestampOverride,
        buildRuleMessage,
      });
      const searchResultWithAggs = searchResult as AggregationsResult;
      if (!searchResultWithAggs.aggregations) {
        throw new Error('expected to find aggregations on search result');
      }

      const bulkCreateResults: BulkCreateResults = {
        bulkCreateTimes: [],
        createdSignalsCount: 0,
        createdSignals: [],
        success: true,
        errors: [],
      };

      const searchAfterResults: SearchAfterResults = {
        searchDurations: [searchDuration],
        searchErrors,
      };

      const eventsAndTerms: Array<{
        event: estypes.SearchHit<SignalSource>;
        newTerms: Array<string | number>;
      }> = [];
      const bucketsForField = searchResultWithAggs.aggregations.new_terms.buckets;
      bucketsForField.forEach((bucket) => {
        eventsAndTerms.push({
          event: bucket.docs.hits.hits[0],
          newTerms: [bucket.key],
        });
      });

      /* const [included, excluded] = await filterEventsAgainstList({
          listClient,
          exceptionsList: exceptionItems,
          logger,
          events,
          buildRuleMessage,
        });*/

      const wrappedAlerts = wrapNewTermsAlerts({
        eventsAndTerms,
        spaceId,
        completeRule,
        mergeStrategy,
        buildReasonMessage: buildReasonMessageForNewTermsAlert,
      });

      // TODO: better way of aggregating results from multiple separate bulkCreate calls
      addBulkCreateResults(bulkCreateResults, await bulkCreate(wrappedAlerts));

      /* const excludedBuckets = bucketsForField
          .filter((bucket) =>
            excluded.some(
              (event) =>
                event._id === bucket.docs.hits.hits[0]._id &&
                event._index === bucket.docs.hits.hits[0]._index
            )
          )
          .map((bucket) => {
            const bucketFilter = {
              term: {
                [field]: bucket.key,
              },
            };
            return {
              bucketFilter: getQueryFilter(
                params.query,
                params.language,
                params.filters ? [...params.filters, bucketFilter] : [bucketFilter],
                inputIndex,
                exceptionItems
              ),
              searchAfterSortIds: undefined,
            };
          });

        combinedExcludedBuckets.push(...excludedBuckets); */

      /* const pageSize = 1000;
      const CHUNK_SIZE = 10;
      while (combinedExcludedBuckets.length > 0) {
        // Process one page of each excluded bucket and for each page return either: 1. a candidate alert
        // not filtered out by the value list exceptions, 2. the search after IDs for the next page, or
        // 3. undefined if there are no more pages to search through for that bucket
        // We keep processing more pages until all buckets are finished (return an alert or no more pages)
        // or the rule times out. By processing one page from every bucket on each iteration we prevent
        // a single huge bucket from starving out all other buckets.
        const bucketChunks = chunk(combinedExcludedBuckets, CHUNK_SIZE);
        const results: Array<BucketResult | undefined> = [];
        for (const bucketChunk of bucketChunks) {
          results.push(
            ...(await Promise.all(
              bucketChunk.map(async (bucket): Promise<BucketResult | undefined> => {
                const { searchResult: postSearchResult, searchErrors: postSearchErrors } =
                  await singleSearchAfter({
                    searchAfterSortIds: bucket.searchAfterSortIds,
                    index: inputIndex,
                    from: tuple.from.toISOString(),
                    to: tuple.to.toISOString(),
                    services,
                    filter: bucket.bucketFilter,
                    logger,
                    pageSize,
                    timestampOverride: params.timestampOverride,
                    buildRuleMessage,
                  });
                searchAfterResults.searchErrors.push(...postSearchErrors);

                const [includedEvents, _] = await filterEventsAgainstList({
                  listClient,
                  exceptionsList: exceptionItems,
                  logger,
                  events: postSearchResult.hits.hits,
                  buildRuleMessage,
                });

                if (includedEvents.length > 0) {
                  return {
                    type: 'alert',
                    result: includedEvents[0],
                  };
                }

                const nextSortIds = getSafeSortIds(
                  searchResult.hits.hits[searchResult.hits.hits.length - 1]?.sort
                );
                if (nextSortIds == null || searchResult.hits.hits.length < pageSize) {
                  return undefined;
                }
                return {
                  type: 'newPage',
                  result: {
                    ...bucket,
                    searchAfterSortIds: nextSortIds,
                  },
                };
              })
            ))
          );
        }

        const alertResults = results.filter(
          (result): result is BucketAlertResult => result != null && result.type === 'alert'
        );
        // Gather up the buckets that have another page to process, we'll do another iteration on
        // these buckets
        const newPageResults = results.filter(
          (result): result is BucketPageResult => result != null && result.type === 'newPage'
        );

        const wrappedAlerts = wrapHits(
          alertResults.map((result) => result.result),
          buildReasonMessageForNewTermsAlert
        );
        addBulkCreateResults(bulkCreateResults, await bulkCreate(wrappedAlerts));
        combinedExcludedBuckets = newPageResults.map((result) => result.result);
      } */

      return {
        // If an error occurs but doesn't cause us to throw then we still count the execution as a success.
        // Should be refactored for better clarity, but that's how it is for now.
        success: true,
        warning: false,
        searchAfterTimes: [searchDuration],
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

type AggregationsResult = ESSearchResponse<
  SignalSource,
  { body: { aggregations: ReturnType<typeof buildAggregation> } }
>;

const buildAggregation = ({
  newValueWindowStart,
  field,
  maxSignals,
  timestampOverride,
}: {
  newValueWindowStart: Moment;
  field: string;
  maxSignals: number;
  timestampOverride: string | undefined;
}) => {
  // If we have a timestampOverride, compute a runtime field that emits the override for each document if it exists,
  // otherwise it emits @timestamp. If we don't have a timestamp override we don't want to pay the cost of using a
  // runtime field, so we just use @timestamp directly.
  const timestampField = timestampOverride ? 'kibana.combined_timestamp' : '@timestamp';
  return {
    new_terms: {
      terms: {
        field,
        // TODO: configure size based on max_signals
        size: maxSignals,
        order: {
          first_seen: 'desc' as const,
        },
      },
      aggs: {
        docs: {
          top_hits: {
            size: 1,
            sort: [
              {
                [timestampField]: 'asc' as const,
              },
            ],
          },
        },
        first_seen: {
          min: {
            field: timestampField,
          },
        },
        filtering_agg: {
          bucket_selector: {
            buckets_path: {
              first_seen_value: 'first_seen',
            },
            script: {
              params: {
                start_time: newValueWindowStart.valueOf(),
              },
              source: 'params.first_seen_value > params.start_time',
            },
          },
        },
      },
    },
  };
};

const buildRuntimeMappings = ({
  timestampOverride,
}: {
  timestampOverride: string | undefined;
}): estypes.MappingRuntimeFields | undefined => {
  return timestampOverride
    ? {
        'kibana.combined_timestamp': {
          type: 'date',
          script: {
            source: `
              if (doc.containsKey(params.timestampOverride) && doc[params.timestampOverride].size()!=0) {
                emit(doc[params.timestampOverride].value.millis);
              } else {
                emit(doc['@timestamp'].value.millis);
              }
            `,
            params: {
              timestampOverride,
            },
          },
        },
      }
    : undefined;
};
