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
import useMount from 'react-use/lib/useMount';
import type { Query, Filter } from '@kbn/es-query';
import { createMergedEsQuery } from '../../application/utils/search_utils';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useTimefilter, useTimeRangeUpdates } from '../../hooks/use_time_filter';
import { useChangePointRequest } from './use_change_point_agg_request';
import { type TimeBuckets, TimeBucketsInterval } from '../../../common/time_buckets';
import { useDataSource } from '../../hooks/use_data_source';
import { usePageUrlState } from '../../hooks/use_url_state';
import { useTimeBuckets } from '../../hooks/use_time_buckets';

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
}>({
  isLoading: false,
  splitFieldsOptions: [],
  metricFieldOptions: [],
  requestParams: {} as ChangePointDetectionRequestParams,
  timeBuckets: {} as TimeBuckets,
  bucketInterval: {} as TimeBucketsInterval,
  updateRequestParams: () => {},
  annotations: [],
});

export type ChangePointType =
  | 'dip'
  | 'distribution_change'
  | 'non_stationary'
  | 'spike'
  | 'stationary'
  | 'step_change'
  | 'trend_change'
  | 'indeterminable';

interface ChangePointAnnotation {
  label: string;
  reason: string;
  timestamp: string;
  group_field: string;
  type: ChangePointType;
  p_value?: number;
}

export const ChangePointDetectionContextProvider: FC = ({ children }) => {
  const { dataView } = useDataSource();
  const {
    uiSettings,
    notifications: { toasts },
    data: {
      query: { filterManager },
    },
  } = useAiopsAppContext();
  const timefilter = useTimefilter();
  const timeBuckets = useTimeBuckets();
  const [annotations, setAnnotations] = useState<ChangePointAnnotation[]>([]);
  const [resultFilters, setResultFilter] = useState<Filter[]>([]);

  const [bucketInterval, setBucketInterval] = useState<TimeBucketsInterval>();

  const timeRange = useTimeRangeUpdates();

  useMount(function updateIntervalOnTimeBoundsChange() {
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
  });

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
    usePageUrlState<ChangePointDetectionRequestParams>('changePoint');

  const requestParams = useMemo(() => {
    const params = { ...requestParamsFromUrl };
    if (!params.fn) {
      params.fn = 'min';
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

  useMount(() => {
    const sub = filterManager.getUpdates$().subscribe(() => {
      setResultFilter(filterManager.getFilters());
    });
    return () => {
      sub.unsubscribe();
    };
  });

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
    return createMergedEsQuery(requestParams.query, resultFilters, dataView, uiSettings);
  }, [resultFilters, requestParams.query, uiSettings, dataView]);

  const { runRequest, cancelRequest, isLoading } = useChangePointRequest(
    requestParams,
    timeRange,
    combinedQuery
  );

  const fetchChangePoints = useCallback(async () => {
    if (!bucketInterval) return;

    cancelRequest();

    const result = await runRequest();
    if (result === null) {
      return;
    }

    if (!result.rawResponse.aggregations) {
      toasts.addDanger('No agg results');
      return;
    }

    const groups = result.rawResponse.aggregations.groupings.buckets
      .map((v) => {
        const changePointType = Object.keys(v.change_point_request.type)[0] as ChangePointType;

        const timeAsString = v.change_point_request.bucket?.key;

        return {
          group_field: v.key,
          type: changePointType,
          p_value: v.change_point_request.type[changePointType].p_value,
          timestamp: timeAsString,
          label: changePointType,
          reason: v.change_point_request.type[changePointType].reason,
        } as ChangePointAnnotation;
      })
      .filter((v): v is ChangePointAnnotation => !!v)
      .sort((a, b) => (a.p_value ?? 100) - (b.p_value ?? 100));

    setAnnotations(groups);
  }, [runRequest, cancelRequest, setAnnotations, toasts, bucketInterval]);

  useEffect(
    function fetchAggResults() {
      fetchChangePoints();
    },
    [fetchChangePoints, runRequest, requestParams, resultFilters]
  );

  if (!bucketInterval) return null;

  const value = {
    isLoading,
    timeBuckets,
    requestParams,
    updateRequestParams,
    metricFieldOptions,
    splitFieldsOptions,
    annotations,
    bucketInterval,
  };

  return (
    <ChangePointDetectionContext.Provider value={value}>
      {children}
    </ChangePointDetectionContext.Provider>
  );
};

export function useChangePontDetectionContext() {
  return useContext(ChangePointDetectionContext);
}

export function useRequestParams() {
  return useChangePontDetectionContext().requestParams;
}
