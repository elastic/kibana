/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useState, useMemo } from 'react';
import { type QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { useRefresh } from '@kbn/ml-date-picker';
import { isDefined } from '@kbn/ml-is-defined';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import {
  ChangePointAnnotation,
  ChangePointDetectionRequestParams,
  ChangePointType,
} from './change_point_detection_context';
import { useDataSource } from '../../hooks/use_data_source';
import { useCancellableSearch } from '../../hooks/use_cancellable_search';
import { SPLIT_FIELD_CARDINALITY_LIMIT, COMPOSITE_AGG_SIZE } from './constants';

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
  query: QueryDslQueryContainer
) {
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
    params: {
      index,
      size: 0,
      body: {
        query,
        aggregations,
      },
    },
  };
}

const CHARTS_PER_PAGE = 6;

export function useChangePointResults(
  requestParams: ChangePointDetectionRequestParams,
  query: QueryDslQueryContainer,
  splitFieldCardinality: number | null
) {
  const {
    notifications: { toasts },
  } = useAiopsAppContext();

  const { dataView } = useDataSource();

  const refresh = useRefresh();

  const [results, setResults] = useState<ChangePointAnnotation[]>([]);
  const [activePage, setActivePage] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);

  const isSingleMetric = !isDefined(requestParams.splitField);

  const totalAggPages = useMemo<number>(() => {
    return Math.ceil(
      Math.min(splitFieldCardinality ?? 0, SPLIT_FIELD_CARDINALITY_LIMIT) / COMPOSITE_AGG_SIZE
    );
  }, [splitFieldCardinality]);

  const { runRequest, cancelRequest, isLoading } = useCancellableSearch();

  const reset = useCallback(() => {
    cancelRequest();
    setProgress(0);
    setActivePage(0);
    setResults([]);
  }, [cancelRequest]);

  const fetchResults = useCallback(
    async (pageNumber: number = 1, afterKey?: string) => {
      try {
        if (!isSingleMetric && !totalAggPages) {
          setProgress(100);
          return;
        }

        const requestPayload = getChangePointDetectionRequestBody(
          {
            index: dataView.getIndexPattern(),
            fn: requestParams.fn,
            timeInterval: requestParams.interval,
            metricField: requestParams.metricField,
            timeField: dataView.timeFieldName!,
            splitField: requestParams.splitField,
            afterKey,
          },
          query
        );
        const result = await runRequest<
          typeof requestPayload,
          { rawResponse: ChangePointAggResponse }
        >(requestPayload);

        if (result === null) {
          setProgress(100);
          return;
        }

        const buckets = (
          isSingleMetric
            ? [result.rawResponse.aggregations]
            : result.rawResponse.aggregations.groupings.buckets
        ) as ChangePointAggResponse['aggregations']['groupings']['buckets'];

        setProgress(Math.min(Math.round((pageNumber / totalAggPages) * 100), 100));

        let groups = buckets.map((v) => {
          const changePointType = Object.keys(v.change_point_request.type)[0] as ChangePointType;
          const timeAsString = v.change_point_request.bucket?.key;
          const rawPValue = v.change_point_request.type[changePointType].p_value;

          return {
            ...(isSingleMetric
              ? {}
              : {
                  group: {
                    name: requestParams.splitField,
                    value: v.key.splitFieldTerm,
                  },
                }),
            type: changePointType,
            p_value: rawPValue,
            timestamp: timeAsString,
            label: changePointType,
            reason: v.change_point_request.type[changePointType].reason,
          } as ChangePointAnnotation;
        });

        if (Array.isArray(requestParams.changePointType)) {
          groups = groups.filter((v) => requestParams.changePointType!.includes(v.type));
        }

        setResults((prev) => {
          return (
            (prev ?? [])
              .concat(groups)
              // Lower p_value indicates a bigger change point, hence the acs sorting
              .sort((a, b) => a.p_value - b.p_value)
          );
        });

        if (
          result.rawResponse.aggregations?.groupings?.after_key?.splitFieldTerm &&
          pageNumber < totalAggPages
        ) {
          await fetchResults(
            pageNumber + 1,
            result.rawResponse.aggregations.groupings.after_key.splitFieldTerm
          );
        } else {
          setProgress(100);
        }
      } catch (e) {
        toasts.addError(e, {
          title: i18n.translate('xpack.aiops.changePointDetection.fetchErrorTitle', {
            defaultMessage: 'Failed to fetch change points',
          }),
        });
      }
    },
    [runRequest, requestParams, query, dataView, totalAggPages, toasts, isSingleMetric]
  );

  useEffect(
    function fetchResultsOnInputChange() {
      reset();
      fetchResults();

      return () => {
        cancelRequest();
      };
    },
    [requestParams, query, splitFieldCardinality, fetchResults, reset, cancelRequest, refresh]
  );

  const pagination = useMemo(() => {
    return {
      activePage,
      pageCount: Math.round((results.length ?? 0) / CHARTS_PER_PAGE),
      updatePagination: setActivePage,
    };
  }, [activePage, results.length]);

  const resultPerPage = useMemo(() => {
    const start = activePage * CHARTS_PER_PAGE;
    return results.slice(start, start + CHARTS_PER_PAGE);
  }, [results, activePage]);

  return { results: resultPerPage, isLoading, reset, progress, pagination };
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
