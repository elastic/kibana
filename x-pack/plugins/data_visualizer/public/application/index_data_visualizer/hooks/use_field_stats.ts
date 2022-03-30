/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { combineLatest, from, Observable, Subject, Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { last, cloneDeep } from 'lodash';
import { mergeMap, switchMap } from 'rxjs/operators';
import { Comparators } from '@elastic/eui';
import type {
  DataStatsFetchProgress,
  FieldStatsSearchStrategyReturnBase,
  OverallStatsSearchStrategyParams,
  FieldStatsCommonRequestParams,
  Field,
} from '../../../../common/types/field_stats';
import { useDataVisualizerKibana } from '../../kibana_context';
import type { FieldRequestConfig } from '../../../../common/types';
import type { DataVisualizerIndexBasedAppState } from '../types/index_data_visualizer_state';
import {
  buildBaseFilterCriteria,
  getSafeAggregationName,
} from '../../../../common/utils/query_utils';
import type { FieldStats, FieldStatsError } from '../../../../common/types/field_stats';
import { getInitialProgress, getReducer } from '../progress_utils';
import { MAX_EXAMPLES_DEFAULT } from '../search_strategy/requests/constants';
import type { ISearchOptions } from '../../../../../../../src/plugins/data/common';
import { getFieldsStats } from '../search_strategy/requests/get_fields_stats';
import { MAX_CONCURRENT_REQUESTS } from '../constants/index_data_visualizer_viewer';
import { filterFields } from '../../common/components/fields_stats_grid/filter_fields';

interface FieldStatsParams {
  metricConfigs: FieldRequestConfig[];
  nonMetricConfigs: FieldRequestConfig[];
}

const createBatchedRequests = (fields: Field[], maxBatchSize = 10) => {
  // Batch up fields by type, getting stats for multiple fields at a time.
  const batches: Field[][] = [];
  const batchedFields: { [key: string]: Field[][] } = {};

  fields.forEach((field) => {
    const fieldType = field.type;
    if (batchedFields[fieldType] === undefined) {
      batchedFields[fieldType] = [[]];
    }
    let lastArray: Field[] = last(batchedFields[fieldType]) as Field[];
    if (lastArray.length === maxBatchSize) {
      lastArray = [];
      batchedFields[fieldType].push(lastArray);
    }
    lastArray.push(field);
  });

  Object.values(batchedFields).forEach((lists) => {
    batches.push(...lists);
  });
  return batches;
};

export function useFieldStatsSearchStrategy(
  searchStrategyParams: OverallStatsSearchStrategyParams | undefined,
  fieldStatsParams: FieldStatsParams | undefined,
  dataVisualizerListState: DataVisualizerIndexBasedAppState
): FieldStatsSearchStrategyReturnBase {
  const {
    services: {
      data,
      notifications: { toasts },
    },
  } = useDataVisualizerKibana();

  const [fieldStats, setFieldStats] = useState<Map<string, FieldStats>>();
  const [fetchState, setFetchState] = useReducer(
    getReducer<DataStatsFetchProgress>(),
    getInitialProgress()
  );

  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();
  const retries$ = useRef<Subscription>();

  const startFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    retries$.current?.unsubscribe();

    abortCtrl.current.abort();
    abortCtrl.current = new AbortController();
    setFetchState({
      ...getInitialProgress(),
      error: undefined,
    });
    setFieldStats(undefined);

    if (
      !searchStrategyParams ||
      !fieldStatsParams ||
      (fieldStatsParams.metricConfigs.length === 0 &&
        fieldStatsParams.nonMetricConfigs.length === 0)
    ) {
      setFetchState({
        loaded: 100,
        isRunning: false,
      });

      return;
    }

    const { sortField, sortDirection } = dataVisualizerListState;
    /**
     * Sort the list of fields by the initial sort field and sort direction
     * Then divide into chunks by the initial page size
     */

    const itemsSorter = Comparators.property(
      sortField as string,
      Comparators.default(sortDirection as 'asc' | 'desc' | undefined)
    );

    const preslicedSortedConfigs = [
      ...fieldStatsParams.metricConfigs,
      ...fieldStatsParams.nonMetricConfigs,
    ].sort(itemsSorter);

    const filteredItems = filterFields(
      preslicedSortedConfigs,
      dataVisualizerListState.visibleFieldNames,
      dataVisualizerListState.visibleFieldTypes
    );

    const { pageIndex, pageSize } = dataVisualizerListState;

    const pageOfConfigs = filteredItems.filteredFields
      ?.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
      .filter((d) => d.existsInDocs === true);

    if (!pageOfConfigs || pageOfConfigs.length === 0) {
      setFetchState({
        loaded: 100,
        isRunning: false,
      });

      return;
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
      maxExamples: MAX_EXAMPLES_DEFAULT,
    };
    const searchOptions: ISearchOptions = {
      abortSignal: abortCtrl.current.signal,
      sessionId: searchStrategyParams?.sessionId,
    };

    const batches = createBatchedRequests(
      pageOfConfigs.map((config, idx) => ({
        fieldName: config.fieldName,
        type: config.type,
        cardinality: config.cardinality,
        safeFieldName: getSafeAggregationName(config.fieldName, idx),
      })),
      10
    );

    const statsMap$ = new Subject();
    const fieldsToRetry$ = new Subject<Field[]>();

    const fieldStatsToFetch = batches
      .map((batch) => getFieldsStats(data.search, params, batch, searchOptions))
      .filter((obs) => obs !== undefined) as Array<Observable<FieldStats[] | FieldStatsError>>;

    const onError = (error: any) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.dataVisualizer.index.errorFetchingFieldStatisticsMessage', {
          defaultMessage: 'Error fetching field statistics',
        }),
      });
      setFetchState({
        isRunning: false,
        error,
      });
    };

    const onComplete = () => {
      setFetchState({
        isRunning: false,
      });
    };

    const statsMapTmp = new Map<string, FieldStats>();

    // First, attempt to fetch field stats in batches of 10
    searchSubscription$.current = from(fieldStatsToFetch)
      .pipe(mergeMap((observable) => observable, MAX_CONCURRENT_REQUESTS))
      .subscribe({
        next: (batchResponse) => {
          setFetchState({
            ...getInitialProgress(),
            error: undefined,
          });

          if (batchResponse) {
            const failedFields: Field[] = [];
            if (Array.isArray(batchResponse)) {
              batchResponse.forEach((f) => {
                if (f.fieldName !== undefined) {
                  statsMapTmp.set(f.fieldName, f);
                }
              });
            } else {
              // If an error occurred during batch
              // retry each field in the failed batch individually
              failedFields.push(...(batchResponse.fields ?? []));
            }

            setFieldStats(statsMapTmp);
            setFetchState({
              loaded: (statsMapTmp.size / pageOfConfigs.length) * 100,
              isRunning: true,
            });

            if (failedFields.length > 0) {
              statsMap$.next(statsMapTmp);
              fieldsToRetry$.next(failedFields);
            }
          }
        },
        error: onError,
        complete: onComplete,
      });

    // If any of batches failed, retry each of the failed field at least one time individually
    retries$.current = combineLatest([
      statsMap$,
      fieldsToRetry$.pipe(
        switchMap((failedFields) => {
          return combineLatest(
            failedFields
              .map((failedField) =>
                getFieldsStats(data.search, params, [failedField], searchOptions)
              )
              .filter((obs) => obs !== undefined)
          );
        })
      ),
    ]).subscribe({
      next: (resp) => {
        const statsMap = cloneDeep(resp[0]) as Map<string, FieldStats>;
        const fieldBatches = resp[1];

        if (Array.isArray(fieldBatches)) {
          fieldBatches.forEach((f) => {
            if (Array.isArray(f) && f.length === 1) {
              statsMap.set(f[0].fields[0], f[0]);
            }
          });
          setFieldStats(statsMap);
          setFetchState({
            loaded: (statsMap.size / pageOfConfigs.length) * 100,
            isRunning: true,
          });
        }
      },
      error: onError,
      complete: onComplete,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data.search,
    toasts,
    fieldStatsParams,
    dataVisualizerListState.pageSize,
    dataVisualizerListState.pageIndex,
    dataVisualizerListState.sortDirection,
    dataVisualizerListState.sortField,
  ]);

  const cancelFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    searchSubscription$.current = undefined;

    retries$.current?.unsubscribe();
    retries$.current = undefined;

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
