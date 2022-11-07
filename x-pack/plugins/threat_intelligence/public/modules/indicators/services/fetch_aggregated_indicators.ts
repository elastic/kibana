/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRangeBounds } from '@kbn/data-plugin/common';
import type { ISearchStart, QueryStart } from '@kbn/data-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { BARCHART_AGGREGATION_NAME, FactoryQueryType } from '../../../../common/constants';
import { RawIndicatorFieldId } from '../../../../common/types/indicator';
import { search } from '../utils/search';
import { getIndicatorQueryParams } from '../utils/get_indicator_query_params';

const TIMESTAMP_FIELD = RawIndicatorFieldId.TimeStamp;

export interface AggregationValue {
  doc_count: number;
  key: number;
  key_as_string: string;
}

export interface Aggregation {
  doc_count: number;
  key: string;
  events: {
    buckets: AggregationValue[];
  };
}

export interface RawAggregatedIndicatorsResponse {
  aggregations: {
    [BARCHART_AGGREGATION_NAME]: {
      buckets: Aggregation[];
    };
  };
}

export interface ChartSeries {
  x: string;
  y: number;
  g: string;
}

export interface FetchAggregatedIndicatorsParams {
  selectedPatterns: string[];
  filters: Filter[];
  filterQuery: Query;
  timeRange: TimeRange;
  field: string;
}

/**
 * Converts data received from an Elastic search with date_histogram aggregation enabled to something usable in the "@elastic/chart" BarChart component
 * @param aggregations An array of {@link Aggregation} objects to process
 * @returns An array of  {@link ChartSeries} directly usable in a BarChart component
 */
export const convertAggregationToChartSeries = (aggregations: Aggregation[]): ChartSeries[] =>
  aggregations.reduce(
    (accumulated: ChartSeries[], current: Aggregation) =>
      accumulated.concat(
        current.events.buckets.map((val: AggregationValue) => ({
          x: val.key_as_string,
          y: val.doc_count,
          g: current.key,
        }))
      ),
    []
  );

export const createFetchAggregatedIndicators =
  ({
    inspectorAdapter,
    searchService,
    queryService,
  }: {
    inspectorAdapter: RequestAdapter;
    searchService: ISearchStart;
    queryService: QueryStart;
  }) =>
  async (
    { selectedPatterns, timeRange, field, filterQuery, filters }: FetchAggregatedIndicatorsParams,
    signal?: AbortSignal
  ): Promise<ChartSeries[]> => {
    const dateRange: TimeRangeBounds =
      queryService.timefilter.timefilter.calculateBounds(timeRange);

    const dateFrom: number = (dateRange.min as moment.Moment).toDate().getTime();
    const dateTo: number = (dateRange.max as moment.Moment).toDate().getTime();

    const sharedParams = getIndicatorQueryParams({ timeRange, filters, filterQuery });

    const searchRequestBody = {
      fields: [TIMESTAMP_FIELD, field],
      size: 0,
      ...sharedParams,
    };

    const {
      aggregations: { [BARCHART_AGGREGATION_NAME]: aggregation },
    } = await search<
      RawAggregatedIndicatorsResponse,
      { dateRange: { from: number; to: number }; field: string }
    >(
      searchService,
      {
        params: {
          index: selectedPatterns,
          body: searchRequestBody,
        },
        factoryQueryType: FactoryQueryType.Barchart,
        dateRange: {
          from: dateFrom,
          to: dateTo,
        },
        field,
      },
      { signal, inspectorAdapter, requestName: 'Indicators barchart' }
    );

    const aggregations: Aggregation[] = aggregation?.buckets;

    const chartSeries: ChartSeries[] = convertAggregationToChartSeries(aggregations);

    return chartSeries;
  };
