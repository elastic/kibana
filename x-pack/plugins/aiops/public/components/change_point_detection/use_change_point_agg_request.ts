/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { type QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { isDefined } from '@kbn/ml-is-defined';
import type {
  MappingRuntimeFields,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { METRIC_TYPE } from '@kbn/analytics';
import { useReload } from '../../hooks/use_reload';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import {
  ChangePointAnnotation,
  ChangePointDetectionRequestParams,
  FieldConfig,
  useChangePointDetectionControlsContext,
} from './change_point_detection_context';
import { useDataSource } from '../../hooks/use_data_source';
import { useCancellableSearch } from '../../hooks/use_cancellable_search';
import {
  type ChangePointType,
  COMPOSITE_AGG_SIZE,
  EXCLUDED_CHANGE_POINT_TYPES,
  SPLIT_FIELD_CARDINALITY_LIMIT,
  CHANGE_POINT_DETECTION_EVENT,
} from './constants';

interface RequestOptions {
  index: string;
  fn: string;
  metricField: string;
  splitField?: string;
  timeField: string;
  timeInterval: string;
  afterKey?: string;
}

function getChangePointDetectionRequestBody(
  { index, fn, metricField, splitField, timeInterval, timeField, afterKey }: RequestOptions,
  query: QueryDslQueryContainer,
  runtimeMappings: MappingRuntimeFields
): SearchRequest {
  const timeSeriesAgg = {
    over_time: {
      date_histogram: {
        field: timeField,
        fixed_interval: timeInterval,
      },
      aggs: {
        function_value: {
          [fn]: {
            field: metricField,
          },
        },
      },
    },
    change_point_request: {
      change_point: {
        buckets_path: 'over_time>function_value',
      },
    },
    // Bucket selecting and sorting are only applicable for partitions
    ...(isDefined(splitField)
      ? {
          select: {
            bucket_selector: {
              buckets_path: { p_value: 'change_point_request.p_value' },
              script: 'params.p_value < 1',
            },
          },
          sort: {
            bucket_sort: {
              sort: [{ 'change_point_request.p_value': { order: 'asc' } }],
            },
          },
        }
      : {}),
  };

  const aggregations = splitField
    ? {
        groupings: {
          composite: {
            size: COMPOSITE_AGG_SIZE,
            ...(afterKey !== undefined ? { after: { splitFieldTerm: afterKey } } : {}),
            sources: [
              {
                splitFieldTerm: {
                  terms: {
                    field: splitField,
                  },
                },
              },
            ],
          },
          aggregations: timeSeriesAgg,
        },
      }
    : timeSeriesAgg;

  return {
    index,
    size: 0,
    body: {
      ...(query ? { query } : {}),
      ...(runtimeMappings ? { runtime_mappings: runtimeMappings } : {}),
      aggregations,
    },
  } as SearchRequest;
}

export function useChangePointResults(
  fieldConfig: FieldConfig,
  requestParams: ChangePointDetectionRequestParams,
  query: QueryDslQueryContainer,
  splitFieldCardinality: number | null,
  excludedAdditionalChangePointTypes?: Set<ChangePointType>
) {
  const {
    notifications: { toasts },
    usageCollection,
    embeddingOrigin,
  } = useAiopsAppContext();

  const { dataView } = useDataSource();
  const { splitFieldsOptions, metricFieldOptions } = useChangePointDetectionControlsContext();
  const { refreshTimestamp: refresh } = useReload();

  const [results, setResults] = useState<ChangePointAnnotation[]>([]);
  /**
   * null also means the fetching has been complete
   */
  const [progress, setProgress] = useState<number | null>(null);

  const isSingleMetric = !isDefined(fieldConfig.splitField);

  const totalAggPages = useMemo<number>(() => {
    return Math.ceil(
      Math.min(splitFieldCardinality ?? 0, SPLIT_FIELD_CARDINALITY_LIMIT) / COMPOSITE_AGG_SIZE
    );
  }, [splitFieldCardinality]);

  const { runRequest, cancelRequest } = useCancellableSearch();

  const reset = useCallback(() => {
    cancelRequest();
    setResults([]);
  }, [cancelRequest]);

  const fetchResults = useCallback(
    async (pageNumber: number = 1, afterKey?: string) => {
      try {
        if (!isSingleMetric && !totalAggPages) {
          setProgress(null);
          return;
        }

        const metricFieldDV = metricFieldOptions.find(
          (option) => option.name === fieldConfig.metricField
        );
        const splitFieldDV = splitFieldsOptions.find(
          (option) => option.name === fieldConfig.splitField
        );

        const runtimeMappings = {
          ...(metricFieldDV?.isRuntimeField
            ? { [metricFieldDV.name]: metricFieldDV.runtimeField! }
            : {}),
          ...(splitFieldDV?.isRuntimeField
            ? { [splitFieldDV.name]: splitFieldDV.runtimeField! }
            : {}),
        } as MappingRuntimeFields;

        const requestPayload: SearchRequest = getChangePointDetectionRequestBody(
          {
            index: dataView.getIndexPattern(),
            fn: fieldConfig.fn,
            timeInterval: requestParams.interval,
            metricField: fieldConfig.metricField,
            timeField: dataView.timeFieldName!,
            splitField: fieldConfig.splitField,
            afterKey,
          },
          query,
          runtimeMappings
        );

        if (usageCollection?.reportUiCounter && embeddingOrigin) {
          usageCollection.reportUiCounter(
            embeddingOrigin,
            METRIC_TYPE.COUNT,
            CHANGE_POINT_DETECTION_EVENT.RUN
          );
        }

        const result = await runRequest<
          { params: SearchRequest },
          { rawResponse: ChangePointAggResponse }
        >({ params: requestPayload });

        if (usageCollection?.reportUiCounter && embeddingOrigin) {
          usageCollection.reportUiCounter(
            embeddingOrigin,
            METRIC_TYPE.COUNT,
            CHANGE_POINT_DETECTION_EVENT.SUCCESS
          );
        }

        if (result === null) {
          setProgress(null);
          return;
        }

        const isFetchCompleted = !(
          isDefined(result.rawResponse.aggregations?.groupings?.after_key?.splitFieldTerm) &&
          pageNumber < totalAggPages
        );

        const buckets = (
          isSingleMetric
            ? [result.rawResponse.aggregations]
            : result.rawResponse.aggregations.groupings.buckets
        ) as ChangePointAggResponse['aggregations']['groupings']['buckets'];

        setProgress(
          isFetchCompleted ? null : Math.min(Math.round((pageNumber / totalAggPages) * 100), 100)
        );

        let groups = buckets
          .map((v) => {
            const changePointType = Object.keys(v.change_point_request.type)[0] as ChangePointType;
            const timeAsString = v.change_point_request.bucket?.key;
            const rawPValue = v.change_point_request.type[changePointType].p_value;

            return {
              ...(isSingleMetric
                ? {}
                : {
                    group: {
                      name: fieldConfig.splitField,
                      value: v.key.splitFieldTerm,
                    },
                  }),
              type: changePointType,
              p_value: rawPValue,
              timestamp: timeAsString,
              label: changePointType,
              reason: v.change_point_request.type[changePointType].reason,
              metricField: fieldConfig.metricField,
              id: isSingleMetric
                ? 'single_metric'
                : `${fieldConfig.splitField}_${v.key?.splitFieldTerm}`,
            } as ChangePointAnnotation;
          })
          .filter(
            (v) =>
              !EXCLUDED_CHANGE_POINT_TYPES.has(v.type) &&
              (excludedAdditionalChangePointTypes
                ? !excludedAdditionalChangePointTypes.has(v.type)
                : true)
          );

        if (Array.isArray(requestParams.changePointType)) {
          groups = groups.filter((v) => requestParams.changePointType!.includes(v.type));
        }

        setResults((prev) => {
          return (prev ?? []).concat(groups);
        });

        if (
          !isFetchCompleted &&
          isDefined(result.rawResponse.aggregations?.groupings?.after_key?.splitFieldTerm)
        ) {
          await fetchResults(
            pageNumber + 1,
            result.rawResponse.aggregations.groupings.after_key!.splitFieldTerm
          );
        }
      } catch (e) {
        if (usageCollection?.reportUiCounter && embeddingOrigin) {
          usageCollection.reportUiCounter(
            embeddingOrigin,
            METRIC_TYPE.COUNT,
            CHANGE_POINT_DETECTION_EVENT.ERROR
          );
        }
        toasts.addError(e, {
          title: i18n.translate('xpack.aiops.changePointDetection.fetchErrorTitle', {
            defaultMessage: 'Failed to fetch change points',
          }),
        });
      }
    },
    [
      embeddingOrigin,
      isSingleMetric,
      totalAggPages,
      dataView,
      fieldConfig.fn,
      fieldConfig.metricField,
      fieldConfig.splitField,
      requestParams.interval,
      requestParams.changePointType,
      query,
      metricFieldOptions,
      splitFieldsOptions,
      runRequest,
      toasts,
      usageCollection,
      excludedAdditionalChangePointTypes,
    ]
  );

  useEffect(
    function fetchResultsOnInputChange() {
      setProgress(0);
      reset();

      if (fieldConfig.splitField && splitFieldCardinality === null) {
        // wait for cardinality to be resolved
        return;
      }

      fetchResults();

      return () => {
        cancelRequest();
      };
    },
    [
      requestParams.interval,
      requestParams.changePointType,
      fieldConfig.fn,
      fieldConfig.metricField,
      fieldConfig.splitField,
      query,
      splitFieldCardinality,
      fetchResults,
      reset,
      cancelRequest,
      refresh,
    ]
  );

  return { results, isLoading: progress !== null, reset, progress };
}

/**
 * Response type for aggregation with composite agg pagination.
 * TODO: update type for the single metric
 */
interface ChangePointAggResponse {
  took: number;
  timed_out: boolean;
  _shards: { total: number; failed: number; successful: number; skipped: number };
  hits: { hits: unknown[]; total: number; max_score: null };
  aggregations: {
    groupings: {
      after_key?: {
        splitFieldTerm: string;
      };
      buckets: Array<{
        key: { splitFieldTerm: string };
        doc_count: number;
        over_time: {
          buckets: Array<{
            key_as_string: string;
            doc_count: number;
            function_value: { value: number };
            key: number;
          }>;
        };
        change_point_request: {
          bucket?: { doc_count: number; function_value: { value: number }; key: string };
          type: {
            [key in ChangePointType]: { p_value: number; change_point: number; reason?: string };
          };
        };
      }>;
    };
  };
}
