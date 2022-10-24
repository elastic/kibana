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
import moment from 'moment';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useTimefilter, useTimeRangeUpdates } from '../../hooks/use_time_filter';
import { useChangePointRequest } from './use_change_point_agg_request';
import { type TimeBuckets } from '../../../common/time_buckets';
import { useDataSource } from '../../hooks/use_data_source';
import { usePageUrlState } from '../../hooks/use_url_state';
import { useTimeBuckets } from '../../hooks/use_time_buckets';

export interface ChangePointDetectionRequestParams {
  fn: string;
  splitField: string;
  metricField: string;
}

export const ChangePointDetectionContext = createContext<{
  timeBuckets: TimeBuckets;
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
  timestamp: string;
  endTimestamp: string;
  group_field: string;
  type: ChangePointType;
  p_value?: number;
}

export const ChangePointDetectionContextProvider: FC = ({ children }) => {
  const { dataView } = useDataSource();
  const {
    notifications: { toasts },
  } = useAiopsAppContext();
  const timefilter = useTimefilter();
  const timeBuckets = useTimeBuckets();
  const [annotations, setAnnotations] = useState<ChangePointAnnotation[]>([]);

  const timeRange = useTimeRangeUpdates();

  useEffect(() => {
    timeBuckets.setBounds(timefilter.getActiveBounds()!);
    timeBuckets.setInterval('auto');
  }, [timeBuckets, timefilter, timeRange]);

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
    return params;
  }, [requestParamsFromUrl, metricFieldOptions, splitFieldsOptions]);

  const { runRequest, isLoading } = useChangePointRequest(timeBuckets, requestParams, timeRange);

  const fetchChangePoints = useCallback(async () => {
    const interval = timeBuckets.getInterval().asSeconds();

    if (!interval) return;

    const result = await runRequest();
    if (!result.rawResponse.aggregations) {
      toasts.addDanger('No agg results');
      return;
    }

    const groups = result.rawResponse.aggregations.groupings.buckets
      .map((v) => {
        const changePointType = Object.keys(v.change_point_request.type)[0] as ChangePointType;

        if (changePointType === 'indeterminable') {
          toasts.addWarning(
            // @ts-ignore
            v.change_point_request.type[changePointType].reason
          );
          return;
        }

        const timeAsString = v.change_point_request.bucket?.key;

        return {
          group_field: v.key,
          type: changePointType,
          p_value: v.change_point_request.type[changePointType].p_value,
          timestamp: timeAsString,
          // @ts-ignore
          endTimestamp: moment(timeAsString).add(timeBuckets.getInterval()).toISOString(),
          label: changePointType,
        } as ChangePointAnnotation;
      })
      .filter((v): v is ChangePointAnnotation => !!v);

    setAnnotations(groups);
  }, [timeBuckets, runRequest, setAnnotations, toasts]);

  useEffect(
    function fetchAggResults() {
      fetchChangePoints();
    },
    [fetchChangePoints, runRequest, requestParams]
  );

  const value = {
    isLoading,
    timeBuckets,
    requestParams,
    updateRequestParams,
    metricFieldOptions,
    splitFieldsOptions,
    annotations,
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
