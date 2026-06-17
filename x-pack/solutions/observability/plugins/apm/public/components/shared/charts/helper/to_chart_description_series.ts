/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartDescriptionSeries } from '@kbn/observability-agent-builder-plugin/public';
import type { Coordinate, TimeSeries } from '@kbn/apm-types';

export const toChartDescriptionSeries = (
  timeseries: Array<TimeSeries<Coordinate>>
): ChartDescriptionSeries[] =>
  timeseries.map((series) => ({
    title: series.title,
    data: series.data.map(({ x, y }) => ({ x, y: y ?? null })),
  }));
