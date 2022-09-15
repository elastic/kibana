/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery, TimeRange } from '@kbn/es-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Subscription } from 'rxjs';
import {
  IEsSearchRequest,
  IKibanaSearchResponse,
  isCompleteResponse,
  isErrorResponse,
  TimeRangeBounds,
} from '@kbn/data-plugin/common';
import { useFilters } from '../../query_bar/hooks/use_filters';
import { convertAggregationToChartSeries } from '../../../common/utils/barchart';
import { RawIndicatorFieldId } from '../../../../common/types/indicator';
import { THREAT_QUERY_BASE } from '../../../../common/constants';
import { calculateBarchartColumnTimeInterval } from '../../../common/utils/dates';
import { useKibana } from '../../../hooks/use_kibana';
import { DEFAULT_TIME_RANGE } from '../../query_bar/hooks/use_filters/utils';
import { useSourcererDataView } from './use_sourcerer_data_view';
import { threatIndicatorNamesOriginScript, threatIndicatorNamesScript } from '../lib/display_name';

export interface UseAggregatedIndicatorsParam {
  /**
   * From and To values passed to the {@link }useAggregatedIndicators} hook
   * to query indicators for the Indicators barchart.
   */
  timeRange?: TimeRange;
}

export interface UseAggregatedIndicatorsValue {
  /**
   * Array of {@link ChartSeries}, ready to be used in the Indicators barchart.
   */
  indicators: ChartSeries[];
  /**
   * Callback used by the IndicatorsFieldSelector component to query a new set of
   * aggregated indicators.
   * @param field the selected Indicator field
   */
  onFieldChange: (field: string) => void;
  /**
   * The min and max times returned by the aggregated Indicators query.
   */
  dateRange: TimeRangeBounds;
  /**
   * Indicator field used to query the aggregated Indicators.
   */
  selectedField: string;
}

export interface Aggregation {
  doc_count: number;
  key: string;
  events: {
    buckets: AggregationValue[];
  };
}

export interface AggregationValue {
  doc_count: number;
  key: number;
  key_as_string: string;
}

export interface ChartSeries {
  x: string;
  y: number;
  g: string;
}

const TIMESTAMP_FIELD = RawIndicatorFieldId.TimeStamp;
const DEFAULT_FIELD = RawIndicatorFieldId.Feed;
export const AGGREGATION_NAME = 'barchartAggregation';

export interface RawAggregatedIndicatorsResponse {
  aggregations: {
    [AGGREGATION_NAME]: {
      buckets: Aggregation[];
    };
  };
}

export const useAggregatedIndicators = ({
  timeRange = DEFAULT_TIME_RANGE,
}: UseAggregatedIndicatorsParam): UseAggregatedIndicatorsValue => {
  const {
    services: {
      data: { search: searchService, query: queryService },
    },
  } = useKibana();

  const { selectedPatterns } = useSourcererDataView();

  const searchSubscription$ = useRef(new Subscription());
  const abortController = useRef(new AbortController());

  const [indicators, setIndicators] = useState<ChartSeries[]>([]);
  const [field, setField] = useState<string>(DEFAULT_FIELD);

  const dateRange: TimeRangeBounds = useMemo(
    () => queryService.timefilter.timefilter.calculateBounds(timeRange),
    [queryService, timeRange]
  );

  const { filters, filterQuery } = useFilters();

  const loadData = useCallback(async () => {
    const dateFrom: number = (dateRange.min as moment.Moment).toDate().getTime();
    const dateTo: number = (dateRange.max as moment.Moment).toDate().getTime();
    const interval = calculateBarchartColumnTimeInterval(dateFrom, dateTo);

    abortController.current = new AbortController();

    const queryToExecute = buildEsQuery(
      undefined,
      [
        {
          query: THREAT_QUERY_BASE,
          language: 'kuery',
        },
        {
          query: filterQuery.query as string,
          language: 'kuery',
        },
      ],
      [
        ...filters,
        {
          query: {
            range: {
              [TIMESTAMP_FIELD]: {
                gte: timeRange.from,
                lte: timeRange.to,
              },
            },
          },
          meta: {},
        },
      ]
    );

    searchSubscription$.current = searchService
      .search<IEsSearchRequest, IKibanaSearchResponse<RawAggregatedIndicatorsResponse>>(
        {
          params: {
            index: selectedPatterns,
            body: {
              aggregations: {
                [AGGREGATION_NAME]: {
                  terms: {
                    field,
                  },
                  aggs: {
                    events: {
                      date_histogram: {
                        field: TIMESTAMP_FIELD,
                        fixed_interval: interval,
                        min_doc_count: 0,
                        extended_bounds: {
                          min: dateFrom,
                          max: dateTo,
                        },
                      },
                    },
                  },
                },
              },
              fields: [TIMESTAMP_FIELD, field], // limit the response to only the fields we need
              size: 0, // we don't need hits, just aggregations
              query: queryToExecute,
              runtime_mappings: {
                'threat.indicator.name': {
                  type: 'keyword',
                  script: {
                    source: threatIndicatorNamesScript(),
                  },
                },
                'threat.indicator.name_origin': {
                  type: 'keyword',
                  script: {
                    source: threatIndicatorNamesOriginScript(),
                  },
                },
              },
            },
          },
        },
        {
          abortSignal: abortController.current.signal,
        }
      )
      .subscribe({
        next: (response) => {
          if (isCompleteResponse(response)) {
            const aggregations: Aggregation[] =
              response.rawResponse.aggregations[AGGREGATION_NAME]?.buckets;
            const chartSeries: ChartSeries[] = convertAggregationToChartSeries(aggregations);
            setIndicators(chartSeries);

            searchSubscription$.current.unsubscribe();
          } else if (isErrorResponse(response)) {
            searchSubscription$.current.unsubscribe();
          }
        },
        error: (msg) => {
          searchService.showError(msg);
          searchSubscription$.current.unsubscribe();
        },
      });
  }, [
    dateRange.max,
    dateRange.min,
    field,
    filterQuery,
    filters,
    searchService,
    selectedPatterns,
    timeRange.from,
    timeRange.to,
  ]);

  const onFieldChange = useCallback(
    async (f: string) => {
      setField(f);
      loadData();
    },
    [loadData, setField]
  );

  useEffect(() => {
    loadData();

    return () => abortController.current.abort();
  }, [loadData]);

  return {
    dateRange,
    indicators,
    onFieldChange,
    selectedField: field,
  };
};
