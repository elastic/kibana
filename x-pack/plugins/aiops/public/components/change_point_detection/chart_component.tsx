/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { ChartsGrid } from './charts_grid';
import { useChangePointResults } from './use_change_point_agg_request';
import { EmbeddableChangePointChartProps } from '../../embeddable';
import { useCommonChartProps } from './use_common_chart_props';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import type { ChangePointAnnotation, FieldConfig } from './change_point_detection_context';

export interface ChartComponentProps {
  fieldConfig: FieldConfig;
  annotation: ChangePointAnnotation;
}

export interface ChartComponentPropsAll {
  fn: string;
  metricField: string;
  splitField?: string;
  maxResults: number;
  timeRange: TimeRange;
  filters?: Filter[];
  query?: Query;
}

export const ChartComponentP: FC<EmbeddableChangePointChartProps> = ({
  timeRange,
  fn,
  metricField,
  maxSeriesToPlot,
  splitField,
  filters = [],
  query = {},
}) => {
  const fieldConfig = { fn, metricField, splitField };

  const { results } = useChangePointResults(fieldConfig, { interval: '5m' }, undefined, 10);

  if (!results.length) return null;

  return <ChartsGrid changePoints={{ 0: results.map((r) => ({ ...r, ...fieldConfig })) }} />;
};

export const ChartComponent: FC<ChartComponentProps> = React.memo(({ annotation, fieldConfig }) => {
  const {
    lens: { EmbeddableComponent },
  } = useAiopsAppContext();

  const { filters, timeRange, query, attributes } = useCommonChartProps({
    fieldConfig,
    annotation,
  });

  return (
    <EmbeddableComponent
      id={`changePointChart_${annotation.group ? annotation.group.value : annotation.label}`}
      style={{ height: 350 }}
      timeRange={timeRange}
      query={query}
      filters={filters}
      // @ts-ignore
      attributes={attributes}
      renderMode={'view'}
      executionContext={{
        type: 'aiops_change_point_detection_chart',
        name: 'Change point detection',
      }}
      disableTriggers
    />
  );
});
