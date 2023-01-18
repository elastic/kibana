/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  FC,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { type DataViewField } from '@kbn/data-views-plugin/public';
import { startWith } from 'rxjs';
import type { Query, Filter } from '@kbn/es-query';
import { usePageUrlState } from '@kbn/ml-url-state';
import { useTimefilter, useTimeRangeUpdates } from '@kbn/ml-date-picker';
import {
  createMergedEsQuery,
  getEsQueryFromSavedSearch,
} from '../../application/utils/search_utils';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useChangePointResults } from './use_change_point_agg_request';
import { type TimeBuckets, TimeBucketsInterval } from '../../../common/time_buckets';
import { useDataSource } from '../../hooks/use_data_source';
import { useTimeBuckets } from '../../hooks/use_time_buckets';

export interface ChangePointDetectionPageUrlState {
  pageKey: 'changePoint';
  pageUrlState: ChangePointDetectionRequestParams;
}

export interface ChangePointDetectionRequestParams {
  fn: string;
  splitField: string;
  metricField: string;
  interval: string;
  query: Query;
  filters: Filter[];
}

export const ChangePointDetectionContext = createContext<{
  timeBuckets: TimeBuckets;
  bucketInterval: TimeBucketsInterval;
  requestParams: ChangePointDetectionRequestParams;
  metricFieldOptions: DataViewField[];
  splitFieldsOptions: DataViewField[];
  updateRequestParams: (update: Partial<ChangePointDetectionRequestParams>) => void;
  isLoading: boolean;
  annotations: ChangePointAnnotation[];
  resultFilters: Filter[];
  updateFilters: (update: Filter[]) => void;
  resultQuery: Query;
  progress: number;
  pagination: {
    activePage: number;
    pageCount: number;
    updatePagination: (newPage: number) => void;
  };
}>({
  isLoading: false,
  splitFieldsOptions: [],
  metricFieldOptions: [],
  requestParams: {} as ChangePointDetectionRequestParams,
  timeBuckets: {} as TimeBuckets,
  bucketInterval: {} as TimeBucketsInterval,
  updateRequestParams: () => {},
  annotations: [],
  resultFilters: [],
  updateFilters: () => {},
  resultQuery: { query: '', language: 'kuery' },
  progress: 0,
  pagination: {
    activePage: 0,
    pageCount: 1,
    updatePagination: () => {},
  },
});

export type ChangePointType =
  | 'dip'
  | 'spike'
  | 'distribution_change'
  | 'step_change'
  | 'trend_change'
  | 'stationary'
  | 'non_stationary'
  | 'indeterminable';

export interface ChangePointAnnotation {
  label: string;
  reason: string;
  timestamp: string;
  group_field: string;
  type: ChangePointType;
  p_value: number;
}

const DEFAULT_AGG_FUNCTION = 'min';

export const ChangePointDetectionContextProvider: FC = ({ children }) => {
  const { dataView, savedSearch } = useDataSource();
  const {
    uiSettings,
    data: {
      query: { filterManager },
    },
  } = useAiopsAppContext();

  const savedSearchQuery = useMemo(() => {
    return getEsQueryFromSavedSearch({
      dataView,
      uiSettings,
      savedSearch,
      filterManager,
    });
  }, [dataView, savedSearch, uiSettings, filterManager]);

  const timefilter = useTimefilter();
  const timeBuckets = useTimeBuckets();
  const [resultFilters, setResultFilter] = useState<Filter[]>([]);

  const [bucketInterval, setBucketInterval] = useState<TimeBucketsInterval>();

  const timeRange = useTimeRangeUpdates();

  useEffect(function updateIntervalOnTimeBoundsChange() {
    const timeUpdateSubscription = timefilter
      .getTimeUpdate$()
      .pipe(startWith(timefilter.getTime()))
      .subscribe(() => {
        const activeBounds = timefilter.getActiveBounds();
        if (!activeBounds) {
          throw new Error('Time bound not available');
        }
        timeBuckets.setInterval('auto');
        timeBuckets.setBounds(activeBounds);
        setBucketInterval(timeBuckets.getInterval());
      });
    return () => {
      timeUpdateSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metricFieldOptions = useMemo<DataViewField[]>(() => {
    return dataView.fields.filter(({ aggregatable, type }) => aggregatable && type === 'number');
  }, [dataView]);

  const splitFieldsOptions = useMemo<DataViewField[]>(() => {
    return dataView.fields.filter(
      ({ aggregatable, esTypes, displayName }) =>
        aggregatable &&
        esTypes &&
        esTypes.includes('keyword') &&
        !['_id', '_index'].includes(displayName)
    );
  }, [dataView]);

  const [requestParamsFromUrl, updateRequestParams] =
    usePageUrlState<ChangePointDetectionPageUrlState>('changePoint');

  const resultQuery = useMemo<Query>(() => {
    return (
      requestParamsFromUrl.query ?? {
        query: savedSearchQuery?.searchString ?? '',
        language: savedSearchQuery?.queryLanguage ?? 'kuery',
      }
    );
  }, [savedSearchQuery, requestParamsFromUrl.query]);

  const requestParams = useMemo(() => {
    const params = { ...requestParamsFromUrl };
    if (!params.fn) {
      params.fn = DEFAULT_AGG_FUNCTION;
    }
    if (!params.metricField && metricFieldOptions.length > 0) {
      params.metricField = metricFieldOptions[0].name;
    }
    if (!params.splitField && splitFieldsOptions.length > 0) {
      params.splitField = splitFieldsOptions[0].name;
    }
    params.interval = bucketInterval?.expression!;
    return params;
  }, [requestParamsFromUrl, metricFieldOptions, splitFieldsOptions, bucketInterval]);

  const updateFilters = useCallback(
    (update: Filter[]) => {
      filterManager.setFilters(update);
    },
    [filterManager]
  );

  useEffect(() => {
    setResultFilter(filterManager.getFilters());
    const sub = filterManager.getUpdates$().subscribe(() => {
      setResultFilter(filterManager.getFilters());
    });
    return () => {
      sub.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    function syncFilters() {
      const globalFilters = filterManager?.getGlobalFilters();
      if (requestParamsFromUrl.filters) {
        filterManager.setFilters(requestParamsFromUrl.filters);
      }
      if (globalFilters) {
        filterManager?.addFilters(globalFilters);
      }
    },
    [requestParamsFromUrl.filters, filterManager]
  );

  const combinedQuery = useMemo(() => {
    const mergedQuery = createMergedEsQuery(resultQuery, resultFilters, dataView, uiSettings);
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

    return mergedQuery;
  }, [resultFilters, resultQuery, uiSettings, dataView, timeRange]);

  const {
    results: annotations,
    isLoading: annotationsLoading,
    progress,
    pagination,
  } = useChangePointResults(requestParams, combinedQuery);

  if (!bucketInterval) return null;

  const value = {
    isLoading: annotationsLoading,
    progress,
    timeBuckets,
    requestParams,
    updateRequestParams,
    metricFieldOptions,
    splitFieldsOptions,
    annotations,
    bucketInterval,
    resultFilters,
    updateFilters,
    resultQuery,
    pagination,
  };

  return (
    <ChangePointDetectionContext.Provider value={value}>
      {children}
    </ChangePointDetectionContext.Provider>
  );
};

export function useChangePointDetectionContext() {
  return useContext(ChangePointDetectionContext);
}

export function useRequestParams() {
  return useChangePointDetectionContext().requestParams;
}
