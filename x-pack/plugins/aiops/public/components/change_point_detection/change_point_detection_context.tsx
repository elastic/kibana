/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { type DataViewField } from '@kbn/data-views-plugin/public';
import { startWith } from 'rxjs';
import type { Filter, Query } from '@kbn/es-query';
import { usePageUrlState } from '@kbn/ml-url-state';
import { useTimefilter } from '@kbn/ml-date-picker';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { type QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { TimeBuckets, TimeBucketsInterval } from '@kbn/ml-time-buckets';
import { useTimeBuckets } from '@kbn/ml-time-buckets';
import { useFilterQueryUpdates } from '../../hooks/use_filters_query';
import { type ChangePointType, DEFAULT_AGG_FUNCTION } from './constants';
import {
  createMergedEsQuery,
  getEsQueryFromSavedSearch,
} from '../../application/utils/search_utils';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useDataSource } from '../../hooks/use_data_source';

export interface ChangePointDetectionPageUrlState {
  pageKey: 'changePoint';
  pageUrlState: ChangePointDetectionRequestParams;
}

export interface FieldConfig {
  fn: string;
  splitField?: string;
  metricField: string;
}

export interface ChangePointDetectionRequestParams {
  fieldConfigs: FieldConfig[];
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
  resultFilters: Filter[];
  updateFilters: (update: Filter[]) => void;
  resultQuery: Query;
  combinedQuery: QueryDslQueryContainer;
  selectedChangePoints: Record<number, SelectedChangePoint[]>;
  setSelectedChangePoints: (update: Record<number, SelectedChangePoint[]>) => void;
}>({
  splitFieldsOptions: [],
  metricFieldOptions: [],
  requestParams: {} as ChangePointDetectionRequestParams,
  timeBuckets: {} as TimeBuckets,
  bucketInterval: {} as TimeBucketsInterval,
  updateRequestParams: () => {},
  resultFilters: [],
  updateFilters: () => {},
  resultQuery: { query: '', language: 'kuery' },
  combinedQuery: {},
  selectedChangePoints: {},
  setSelectedChangePoints: () => {},
});

export interface ChangePointAnnotation {
  id: string;
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

export type SelectedChangePoint = FieldConfig & ChangePointAnnotation;

export const ChangePointDetectionControlsContext = createContext<{
  metricFieldOptions: DataViewField[];
  splitFieldsOptions: DataViewField[];
}>({
  splitFieldsOptions: [],
  metricFieldOptions: [],
});

export const useChangePointDetectionControlsContext = () => {
  return useContext(ChangePointDetectionControlsContext);
};

export const ChangePointDetectionControlsContextProvider: FC<PropsWithChildren<unknown>> = ({
  children,
}) => {
  const { dataView } = useDataSource();

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

  const value = { metricFieldOptions, splitFieldsOptions };

  return (
    <ChangePointDetectionControlsContext.Provider value={value}>
      {children}
    </ChangePointDetectionControlsContext.Provider>
  );
};

export const ChangePointDetectionContextProvider: FC<PropsWithChildren<unknown>> = ({
  children,
}) => {
  const { dataView, savedSearch } = useDataSource();
  const {
    uiSettings,
    data: {
      query: { filterManager, queryString },
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
  const timeBuckets = useTimeBuckets(uiSettings);

  const { searchBounds } = useFilterQueryUpdates();

  const [resultFilters, setResultFilter] = useState<Filter[]>([]);
  const [selectedChangePoints, setSelectedChangePoints] = useState<
    Record<number, SelectedChangePoint[]>
  >({});
  const [bucketInterval, setBucketInterval] = useState<TimeBucketsInterval>();

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
    if (!params.fieldConfigs) {
      params.fieldConfigs = [
        {
          fn: DEFAULT_AGG_FUNCTION,
          metricField: metricFieldOptions[0]?.name,
        },
      ];
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
      if (requestParamsFromUrl.query) {
        queryString.setQuery(requestParamsFromUrl.query);
      }
      if (globalFilters) {
        filterManager?.addFilters(globalFilters);
      }
      return () => {
        filterManager?.removeAll();
        queryString.clearQuery();
      };
    },
    [requestParamsFromUrl.filters, requestParamsFromUrl.query, filterManager, queryString]
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
          from: searchBounds.min?.valueOf(),
          to: searchBounds.max?.valueOf(),
        },
      },
    });

    return mergedQuery;
  }, [resultFilters, resultQuery, uiSettings, dataView, searchBounds]);

  if (!bucketInterval) return null;

  const value = {
    timeBuckets,
    requestParams,
    updateRequestParams,
    metricFieldOptions,
    splitFieldsOptions,
    bucketInterval,
    resultFilters,
    updateFilters,
    resultQuery,
    combinedQuery,
    selectedChangePoints,
    setSelectedChangePoints,
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
