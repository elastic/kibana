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
import type { Filter, Query } from '@kbn/es-query';
import { usePageUrlState } from '@kbn/ml-url-state';
import { useTimefilter, useTimeRangeUpdates } from '@kbn/ml-date-picker';
import moment from 'moment';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { DEFAULT_AGG_FUNCTION } from './constants';
import { useSplitFieldCardinality } from './use_split_field_cardinality';
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
  splitField?: string;
  metricField: string;
  interval: string;
  query: Query;
  filters: Filter[];
  changePointType?: ChangePointType[];
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
  splitFieldCardinality: number | null;
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
  splitFieldCardinality: null,
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
  group?: {
    name: string;
    value: string;
  };
  type: ChangePointType;
  p_value: number;
}

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
        esTypes.some((el) =>
          [ES_FIELD_TYPES.KEYWORD, ES_FIELD_TYPES.IP].includes(el as ES_FIELD_TYPES)
        ) &&
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
    params.interval = bucketInterval?.expression!;
    return params;
  }, [requestParamsFromUrl, metricFieldOptions, bucketInterval]);

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
          from: moment(timeRange.from).valueOf(),
          to: moment(timeRange.to).valueOf(),
        },
      },
    });

    return mergedQuery;
  }, [resultFilters, resultQuery, uiSettings, dataView, timeRange]);

  const splitFieldCardinality = useSplitFieldCardinality(requestParams.splitField, combinedQuery);

  const {
    results: annotations,
    isLoading: annotationsLoading,
    progress,
    pagination,
  } = useChangePointResults(requestParams, combinedQuery, splitFieldCardinality);

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
    splitFieldCardinality,
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
