/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type {
  FieldStatsSearchStrategyProgress,
  FieldStatsSearchStrategyReturnBase,
  OverallStatsSearchStrategyParams,
} from '../../../../common/search_strategy/types';
import { useDataVisualizerKibana } from '../../kibana_context';
import type { FieldRequestConfig } from '../../../../common';
import type { DataVisualizerIndexBasedAppState } from '../types/index_data_visualizer_state';
import type { FieldStatsCommonRequestParams } from '../../../../common/search_strategy/types';
import {
  buildBaseFilterCriteria,
  getSafeAggregationName,
} from '../../../../common/utils/query_utils';
import { getFieldStats } from '../search_strategy/requests/get_field_stats';
import type { FieldStats, FieldStatsError } from '../types/field_stats';

const getInitialProgress = (): FieldStatsSearchStrategyProgress => ({
  isRunning: false,
  loaded: 0,
  total: 100,
});

const getReducer =
  <T>() =>
  (prev: T, update: Partial<T>): T => ({
    ...prev,
    ...update,
  });
interface FieldStatsParams {
  metricConfigs: FieldRequestConfig[];
  nonMetricConfigs: FieldRequestConfig[];
}

export function useFieldStatsSearchStrategy(
  searchStrategyParams: OverallStatsSearchStrategyParams | undefined,
  fieldStatsParams: FieldStatsParams | undefined,
  initialDataVisualizerListState: DataVisualizerIndexBasedAppState
): FieldStatsSearchStrategyReturnBase {
  const {
    services: {
      data,
      notifications: { toasts },
    },
  } = useDataVisualizerKibana();

  const [fieldStats, setFieldStats] = useState<Map<string, FieldStats>>();

  const [fetchState, setFetchState] = useReducer(
    getReducer<FieldStatsSearchStrategyProgress>(),
    getInitialProgress()
  );

  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();

  const startFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    abortCtrl.current.abort();
    abortCtrl.current = new AbortController();
    setFetchState({
      ...getInitialProgress(),
      error: undefined,
    });

    if (!searchStrategyParams || !fieldStatsParams) return;
    if (
      fieldStatsParams.metricConfigs.length === 0 &&
      fieldStatsParams.nonMetricConfigs.length === 0
    )
      return;

    const { sortField, sortDirection } = initialDataVisualizerListState;
    /**
     * Sort the list of fields by the initial sort field and sort direction
     * Then divide into chunks by the initial page size
     */

    let sortedConfigs = [...fieldStatsParams.metricConfigs, ...fieldStatsParams.nonMetricConfigs];

    if (sortField === 'fieldName' || sortField === 'type') {
      sortedConfigs = sortedConfigs.sort((a, b) => a[sortField].localeCompare(b[sortField]));
    }
    if (sortDirection === 'desc') {
      sortedConfigs = sortedConfigs.reverse();
    }

    const filterCriteria = buildBaseFilterCriteria(
      searchStrategyParams.timeFieldName,
      searchStrategyParams.earliest,
      searchStrategyParams.latest,
      searchStrategyParams.searchQuery
    );

    const params: FieldStatsCommonRequestParams = {
      index: searchStrategyParams.index,
      samplerShardSize: searchStrategyParams.samplerShardSize,
      timeFieldName: searchStrategyParams.timeFieldName,
      earliestMs: searchStrategyParams.earliest,
      latestMs: searchStrategyParams.latest,
      runtimeFieldMap: searchStrategyParams.runtimeFieldMap,
      intervalMs: searchStrategyParams.intervalMs,
      query: {
        bool: {
          filter: filterCriteria,
        },
      },
    };
    const searchOptions = {
      abortSignal: abortCtrl.current.signal,
      sessionId: searchStrategyParams?.sessionId,
    };
    const sub = combineLatest(
      sortedConfigs
        .map((config, idx) =>
          getFieldStats(
            data,
            params,
            {
              fieldName: config.fieldName,
              type: config.type,
              cardinality: config.cardinality,
              safeFieldName: getSafeAggregationName(config.fieldName, idx),
            },
            searchOptions
          )
        )
        .filter((obs) => obs !== undefined) as Array<Observable<FieldStats | FieldStatsError>>
    );

    searchSubscription$.current = sub.subscribe({
      next: (resp) => {
        if (resp) {
          const statsMap = resp.reduce((map, field) => {
            map.set(field.fieldName, field);
            return map;
          }, new Map<string, FieldStats>());

          setFieldStats(statsMap);
        }
      },
      error: (error) => {
        toasts.addError(error, {
          title: i18n.translate('xpack.dataVisualizer.index.errorFetchingFieldStatisticsMessage', {
            defaultMessage: 'Error fetching field statistics',
          }),
        });
      },
    });
  }, [data, toasts, searchStrategyParams, fieldStatsParams, initialDataVisualizerListState]);

  const cancelFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    searchSubscription$.current = undefined;
    abortCtrl.current.abort();
    setFetchState({
      isRunning: false,
    });
  }, []);

  // auto-update
  useEffect(() => {
    startFetch();
    return cancelFetch;
  }, [startFetch, cancelFetch]);

  return {
    progress: fetchState,
    fieldStats,
    startFetch,
    cancelFetch,
  };
}
