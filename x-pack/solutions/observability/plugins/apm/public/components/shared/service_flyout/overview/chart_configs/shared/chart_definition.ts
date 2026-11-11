/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { ComposerQuery } from '@elastic/esql';
import type { LensESQLConfig } from '../../types';
import { ChartType, getTimeSeriesColor } from '../../../../charts/helper/get_timeseries_color';
import {
  ESQL_NULLIFY_UNMAPPED_FIELDS,
  TIME_BUCKET_FIELD,
  esqlSetProjectRouting,
} from './constants';
import type { FlyoutLensChartConfigDefinition, LensYAxis, LensYBounds } from './types';

export function printQuery(query: ComposerQuery): string {
  return `${query.print('basic')}`;
}

export const seriesColor = (chartType: ChartType) =>
  getTimeSeriesColor(chartType).currentPeriodColor;

export function buildChartDefinition({
  id,
  title,
  titleAction,
  indices,
  buildQuery,
  yAxis,
  yBounds,
  projectRouting,
}: {
  id: string;
  title: string;
  titleAction?: ReactNode;
  indices: string | undefined;
  buildQuery: (indices: string) => ComposerQuery;
  yAxis: LensYAxis[];
  yBounds?: LensYBounds;
  projectRouting?: string;
}): FlyoutLensChartConfigDefinition {
  if (!indices) {
    return { id, title, titleAction };
  }

  const setInstructions = [
    ...(projectRouting ? [esqlSetProjectRouting(projectRouting)] : []),
    ESQL_NULLIFY_UNMAPPED_FIELDS,
  ].join('\n');

  const config: LensESQLConfig = {
    chartType: 'xy',
    title,
    dataset: { esql: `${setInstructions}\n${printQuery(buildQuery(indices))}` },
    layers: [
      {
        type: 'series',
        seriesType: 'line',
        xAxis: { field: TIME_BUCKET_FIELD, type: 'dateHistogram' },
        yAxis,
      },
    ],
    legend: { show: false },
    fittingFunction: 'Linear',
    axisTitleVisibility: {
      showXAxisTitle: false,
      showYAxisTitle: false,
      showYRightAxisTitle: false,
    },
    ...(yBounds ? { yBounds } : {}),
  };

  return { id, title, titleAction, config };
}

export { ChartType };
