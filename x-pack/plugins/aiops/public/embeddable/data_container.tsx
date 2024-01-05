/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useMemo } from 'react';
import { useTimefilter } from '@kbn/ml-date-picker';
import { css } from '@emotion/react';
import { ChangePointsTable } from '../components/change_point_detection/change_points_table';
import { EmbeddableChangePointChartProps } from './types';
import { useFilerQueryUpdates } from '../hooks/use_filters_query';
import { useDataSource } from '../hooks/use_data_source';
import { useAiopsAppContext } from '../hooks/use_aiops_app_context';
import { useTimeBuckets } from '../hooks/use_time_buckets';
import { createMergedEsQuery } from '../application/utils/search_utils';
import type {
  ChangePointAnnotation,
  ChangePointDetectionRequestParams,
} from '../components/change_point_detection/change_point_detection_context';
import { useChangePointResults } from '../components/change_point_detection/use_change_point_agg_request';
import { NoChangePointsWarning } from '../components/change_point_detection/no_change_points_warning';

/**
 * Component responsible for fetching change point results and rendering the view component
 */
export const DataContainer: FC<
  EmbeddableChangePointChartProps & {
    onRenderComplete: () => void;
    onLoading: () => void;
    onError: (error: Error) => void;
  }
> = ({
  fn,
  metricField,
  maxSeriesToPlot,
  splitField,
  partitions,
  onError,
  onLoading,
  onRenderComplete,
  onChange,
  emptyState,
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

    if (Array.isArray(partitions) && partitions.length > 0 && fieldConfig.splitField) {
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

  const { results, isLoading } = useChangePointResults(
    fieldConfig,
    requestParams,
    combinedQuery,
    10000
  );

  useEffect(() => {
    if (isLoading) {
      onLoading();
    }
  }, [onLoading, isLoading]);

  const changePoints = useMemo<ChangePointAnnotation[]>(() => {
    let resultChangePoints: ChangePointAnnotation[] = results;

    if (maxSeriesToPlot) {
      resultChangePoints = resultChangePoints.slice(0, maxSeriesToPlot);
    }

    if (onChange) {
      onChange(resultChangePoints);
    }

    return resultChangePoints;
  }, [results, maxSeriesToPlot, onChange]);

  return (
    <div
      css={css`
        overflow: auto;
        width: 100%;
      `}
    >
      {changePoints.length > 0 ? (
        <ChangePointsTable annotations={changePoints} fieldConfig={fieldConfig} isLoading={false} />
      ) : emptyState ? (
        emptyState
      ) : (
        <NoChangePointsWarning onRenderComplete={onRenderComplete} />
      )}
    </div>
  );
};
