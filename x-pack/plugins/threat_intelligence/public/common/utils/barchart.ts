/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Aggregation,
  AggregationValue,
  ChartSeries,
} from '../../modules/indicators/services/fetch_aggregated_indicators';

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
