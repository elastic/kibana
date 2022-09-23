/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange } from '@kbn/es-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Subscription } from 'rxjs';
import {
  IEsSearchRequest,
  IKibanaSearchResponse,
  isCompleteResponse,
  isErrorResponse,
  TimeRangeBounds,
} from '@kbn/data-plugin/common';
import { useInspector } from '../../../hooks/use_inspector';
import { useFilters } from '../../query_bar/hooks/use_filters';
import { convertAggregationToChartSeries } from '../../../common/utils/barchart';
import { RawIndicatorFieldId } from '../../../../common/types/indicator';
import { calculateBarchartColumnTimeInterval } from '../../../common/utils/dates';
import { useKibana } from '../../../hooks/use_kibana';
import { DEFAULT_TIME_RANGE } from '../../query_bar/hooks/use_filters/utils';
import { useSourcererDataView } from './use_sourcerer_data_view';
import { getRuntimeMappings } from '../lib/get_runtime_mappings';
import { getIndicatorsQuery } from '../lib/get_indicators_query';

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

  const { inspectorAdapters } = useInspector();

  const searchSubscription$ = useRef(new Subscription());
  const abortController = useRef(new AbortController());

  const [indicators, setIndicators] = useState<ChartSeries[]>([]);
  const [field, setField] = useState<string>(DEFAULT_FIELD);
  const { filters, filterQuery } = useFilters();

  const dateRange: TimeRangeBounds = useMemo(
    () => queryService.timefilter.timefilter.calculateBounds(timeRange),
    [queryService, timeRange]
  );

  const queryToExecute = useMemo(() => {
    return getIndicatorsQuery({ timeRange, filters, filterQuery });
  }, [filterQuery, filters, timeRange]);

  const loadData = useCallback(async () => {
    const dateFrom: number = (dateRange.min as moment.Moment).toDate().getTime();
    const dateTo: number = (dateRange.max as moment.Moment).toDate().getTime();
    const interval = calculateBarchartColumnTimeInterval(dateFrom, dateTo);

    const request = inspectorAdapters.requests.start('Indicator barchart', {});

    request.stats({
      indexPattern: {
        label: 'Index patterns',
        value: selectedPatterns,
      },
    });

    abortController.current = new AbortController();

    const requestBody = {
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
      fields: [TIMESTAMP_FIELD, field],
      size: 0,
      query: queryToExecute,
      runtime_mappings: getRuntimeMappings(),
    };

    searchSubscription$.current = searchService
      .search<IEsSearchRequest, IKibanaSearchResponse<RawAggregatedIndicatorsResponse>>(
        {
          params: {
            index: selectedPatterns,
            body: requestBody,
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

            request.stats({}).ok({ json: response });
            request.json(requestBody);
          } else if (isErrorResponse(response)) {
            request.error({ json: response });
            searchSubscription$.current.unsubscribe();
          }
        },
        error: (requestError) => {
          searchService.showError(requestError);
          searchSubscription$.current.unsubscribe();

          if (requestError instanceof Error && requestError.name.includes('Abort')) {
            inspectorAdapters.requests.reset();
          } else {
            request.error({ json: requestError });
          }
        },
      });
  }, [
    dateRange.max,
    dateRange.min,
    field,
    inspectorAdapters.requests,
    queryToExecute,
    searchService,
    selectedPatterns,
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
