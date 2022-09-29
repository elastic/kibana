/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { useMemo, useState } from 'react';
import { TimeRangeBounds } from '@kbn/data-plugin/common';
import { useInspector } from '../../../hooks/use_inspector';
import { RawIndicatorFieldId } from '../../../../common/types/indicator';
import { useKibana } from '../../../hooks/use_kibana';
import { DEFAULT_TIME_RANGE } from '../../query_bar/hooks/use_filters/utils';
import { useSourcererDataView } from './use_sourcerer_data_view';
import {
  ChartSeries,
  createFetchAggregatedIndicators,
  FetchAggregatedIndicatorsParams,
} from '../services/fetch_aggregated_indicators';

export interface UseAggregatedIndicatorsParam {
  /**
   * From and To values passed to the {@link }useAggregatedIndicators} hook
   * to query indicators for the Indicators barchart.
   */
  timeRange?: TimeRange;
  filters: Filter[];
  filterQuery: Query;
}

export interface UseAggregatedIndicatorsValue {
  /**
   * Array of {@link ChartSeries}, ready to be used in the Indicators barchart.
   */
  series: ChartSeries[];
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

const DEFAULT_FIELD = RawIndicatorFieldId.Feed;

export const useAggregatedIndicators = ({
  timeRange = DEFAULT_TIME_RANGE,
  filters,
  filterQuery,
}: UseAggregatedIndicatorsParam): UseAggregatedIndicatorsValue => {
  const {
    services: {
      data: { search: searchService, query: queryService },
    },
  } = useKibana();

  const { selectedPatterns } = useSourcererDataView();

  const { inspectorAdapters } = useInspector();

  const [field, setField] = useState<string>(DEFAULT_FIELD);

  const aggregatedIndicatorsQuery = useMemo(
    () =>
      createFetchAggregatedIndicators({
        queryService,
        searchService,
        inspectorAdapter: inspectorAdapters.requests,
      }),
    [inspectorAdapters, queryService, searchService]
  );

  const { data } = useQuery(
    [
      'indicatorsBarchart',
      {
        filters,
        field,
        filterQuery,
        selectedPatterns,
        timeRange,
      },
    ],
    ({
      signal,
      queryKey: [_key, queryParams],
    }: {
      signal?: AbortSignal;
      queryKey: [string, FetchAggregatedIndicatorsParams];
    }) => aggregatedIndicatorsQuery(queryParams, signal)
  );

  const dateRange = useMemo(
    () => queryService.timefilter.timefilter.calculateBounds(timeRange),
    [queryService.timefilter.timefilter, timeRange]
  );

  return {
    dateRange,
    series: data || [],
    onFieldChange: setField,
    selectedField: field,
  };
};
