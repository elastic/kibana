/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { css } from '@emotion/react';
import { useTimefilter } from '@kbn/ml-date-picker';
import { useFilerQueryUpdates } from '../../hooks/use_filters_query';
import { useTimeBuckets } from '../../hooks/use_time_buckets';
import { useDataSource } from '../../hooks/use_data_source';
import { createMergedEsQuery } from '../../application/utils/search_utils';
import { ChartsGrid } from './charts_grid';
import { useChangePointResults } from './use_change_point_agg_request';
import { EmbeddableChangePointChartProps } from '../../embeddable';
import { useCommonChartProps } from './use_common_chart_props';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import type { ChangePointAnnotation, FieldConfig } from './change_point_detection_context';
import { ChangePointDetectionRequestParams } from './change_point_detection_context';

export interface ChartComponentProps {
  fieldConfig: FieldConfig;
  annotation: ChangePointAnnotation;

  interval: string;
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

/**
 * Grid component wrapper for embeddable.
 *
 * @param timeRange
 * @param fn
 * @param metricField
 * @param maxSeriesToPlot
 * @param splitField
 * @param partitions
 * @constructor
 */
export const ChardGridEmbeddableWrapper: FC<EmbeddableChangePointChartProps> = ({
  fn,
  metricField,
  maxSeriesToPlot,
  splitField,
  partitions,
}) => {
  const { filters, query, timeRange } = useFilerQueryUpdates();

  const fieldConfig = useMemo(() => {
    return { fn, metricField, splitField };
  }, [fn, metricField, splitField]);

  const { dataView } = useDataSource();
  const { uiSettings } = useAiopsAppContext();
  const timeBuckets = useTimeBuckets();
  const timefilter = useTimefilter();

  const interval = useMemo(() => {
    timeBuckets.setInterval('auto');
    timeBuckets.setBounds(timefilter.calculateBounds(timeRange));
    return timeBuckets.getInterval().expression;
  }, [timeRange, timeBuckets, timefilter]);

  const combinedQuery = useMemo(() => {
    const mergedQuery = createMergedEsQuery(query, filters, dataView, uiSettings);
    if (!Array.isArray(mergedQuery.bool?.filter)) {
      if (!mergedQuery.bool) {
        mergedQuery.bool = {};
      }
      mergedQuery.bool.filter = [];
    }

    mergedQuery.bool!.filter.push({
      range: {
        [dataView.timeFieldName!]: {
          from: timeRange.from,
          to: timeRange.to,
        },
      },
    });

    if (partitions && fieldConfig.splitField) {
      mergedQuery.bool?.filter.push({
        terms: {
          [fieldConfig.splitField]: partitions,
        },
      });
    }

    return mergedQuery;
  }, [
    dataView,
    fieldConfig.splitField,
    filters,
    partitions,
    query,
    timeRange.from,
    timeRange.to,
    uiSettings,
  ]);

  const requestParams = useMemo<ChangePointDetectionRequestParams>(() => {
    return { interval } as ChangePointDetectionRequestParams;
  }, [interval]);

  const { results } = useChangePointResults(
    fieldConfig,
    requestParams,
    combinedQuery,
    maxSeriesToPlot ?? 10
  );

  if (!results.length) return null;

  return (
    <div
      css={css`
        overflow: auto;
        width: 100%;
      `}
    >
      <ChartsGrid
        changePoints={results.map((r) => ({ ...r, ...fieldConfig }))}
        interval={requestParams.interval}
      />
    </div>
  );
};

export const ChartComponent: FC<ChartComponentProps> = React.memo(
  ({ annotation, fieldConfig, interval }) => {
    const {
      lens: { EmbeddableComponent },
    } = useAiopsAppContext();

    const { filters, timeRange, query, attributes } = useCommonChartProps({
      fieldConfig,
      annotation,
      bucketInterval: interval,
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
  }
);
