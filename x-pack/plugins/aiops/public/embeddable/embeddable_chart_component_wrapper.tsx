/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, type Observable, combineLatest } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { useTimefilter } from '@kbn/ml-date-picker';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import { ReloadContextProvider } from '../hooks/use_reload';
import {
  type ChangePointAnnotation,
  ChangePointDetectionControlsContextProvider,
  type ChangePointDetectionRequestParams,
} from '../components/change_point_detection/change_point_detection_context';
import type {
  EmbeddableChangePointChartInput,
  EmbeddableChangePointChartOutput,
} from './embeddable_change_point_chart';
import {
  EmbeddableChangePointChartProps,
  RelatedEventsFilter,
} from './embeddable_change_point_chart_component';
import { FilterQueryContextProvider, useFilerQueryUpdates } from '../hooks/use_filters_query';
import { DataSourceContextProvider, useDataSource } from '../hooks/use_data_source';
import { useAiopsAppContext } from '../hooks/use_aiops_app_context';
import { useTimeBuckets } from '../hooks/use_time_buckets';
import { createMergedEsQuery } from '../application/utils/search_utils';
import { useChangePointResults } from '../components/change_point_detection/use_change_point_agg_request';
import { ChartsGrid } from '../components/change_point_detection/charts_grid';
import { NoChangePointsWarning } from '../components/change_point_detection/no_change_points_warning';

const defaultSort = {
  field: 'p_value' as keyof ChangePointAnnotation,
  direction: 'asc',
};

export interface EmbeddableInputTrackerProps {
  input$: Observable<EmbeddableChangePointChartInput>;
  initialInput: EmbeddableChangePointChartInput;
  reload$: Observable<number>;
  onOutputChange: (output: Partial<EmbeddableChangePointChartOutput>) => void;
  onRenderComplete: () => void;
  onLoading: () => void;
  onError: (error: Error) => void;
}

export const EmbeddableInputTracker: FC<EmbeddableInputTrackerProps> = ({
  input$,
  initialInput,
  reload$,
  onOutputChange,
  onRenderComplete,
  onLoading,
  onError,
}) => {
  const input = useObservable(input$, initialInput);

  const [manualReload$] = useState<BehaviorSubject<number>>(
    new BehaviorSubject<number>(initialInput.lastReloadRequestTime ?? Date.now())
  );

  useEffect(
    function updateManualReloadSubject() {
      if (
        input.lastReloadRequestTime === initialInput.lastReloadRequestTime ||
        !input.lastReloadRequestTime
      )
        return;
      manualReload$.next(input.lastReloadRequestTime);
    },
    [input.lastReloadRequestTime, initialInput.lastReloadRequestTime, manualReload$]
  );

  const resultObservable$ = useMemo<Observable<number>>(() => {
    return combineLatest([reload$, manualReload$]).pipe(
      map(([reload, manualReload]) => Math.max(reload, manualReload)),
      distinctUntilChanged()
    );
  }, [manualReload$, reload$]);

  return (
    <ReloadContextProvider reload$={resultObservable$}>
      <DataSourceContextProvider dataViewId={input.dataViewId}>
        <ChangePointDetectionControlsContextProvider>
          <FilterQueryContextProvider timeRange={input.timeRange}>
            <ChartGridEmbeddableWrapper
              timeRange={input.timeRange}
              fn={input.fn}
              metricField={input.metricField}
              splitField={input.splitField}
              maxSeriesToPlot={input.maxSeriesToPlot}
              dataViewId={input.dataViewId}
              partitions={input.partitions}
              onLoading={onLoading}
              onRenderComplete={onRenderComplete}
              onError={onError}
              onChange={input.onChange}
              emptyState={input.emptyState}
              relatedEventsFilter={input.relatedEventsFilter}
              relatedEventsStyle={input.relatedEventsStyle}
              excludedAdditionalChangePointTypes={input.excludedAdditionalChangePointTypes}
            />
          </FilterQueryContextProvider>
        </ChangePointDetectionControlsContextProvider>
      </DataSourceContextProvider>
    </ReloadContextProvider>
  );
};

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
export const ChartGridEmbeddableWrapper: FC<
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
  relatedEventsFilter,
  relatedEventsStyle,
  excludedAdditionalChangePointTypes,
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

    if (relatedEventsFilter) {
      mergedQuery.bool!.filter.push(
        ...(relatedEventsFilter.filter((item) => item !== null) as RelatedEventsFilter[])
      );
    }

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
    relatedEventsFilter,
  ]);

  const requestParams = useMemo<ChangePointDetectionRequestParams>(() => {
    return { interval } as ChangePointDetectionRequestParams;
  }, [interval]);

  const { results, isLoading } = useChangePointResults(
    fieldConfig,
    requestParams,
    combinedQuery,
    10000,
    excludedAdditionalChangePointTypes
  );

  useEffect(() => {
    if (isLoading) {
      onLoading();
    }
  }, [onLoading, isLoading]);

  const changePoints = useMemo<ChangePointAnnotation[]>(() => {
    let resultChangePoints: ChangePointAnnotation[] = results.sort((a, b) => {
      if (defaultSort.direction === 'asc') {
        return (a[defaultSort.field] as number) - (b[defaultSort.field] as number);
      } else {
        return (b[defaultSort.field] as number) - (a[defaultSort.field] as number);
      }
    });

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
        <ChartsGrid
          relatedEventsStyle={relatedEventsStyle}
          changePoints={changePoints.map((r) => ({ ...r, ...fieldConfig }))}
          interval={requestParams.interval}
          onRenderComplete={onRenderComplete}
        />
      ) : emptyState ? (
        emptyState
      ) : (
        <NoChangePointsWarning />
      )}
    </div>
  );
};
