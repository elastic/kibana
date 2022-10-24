/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useMemo } from 'react';
import { createContext } from 'react';
import { type DataViewField } from '@kbn/data-views-plugin/public';
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
}>({
  splitFieldsOptions: [],
  metricFieldOptions: [],
  requestParams: {} as ChangePointDetectionRequestParams,
  timeBuckets: {} as TimeBuckets,
});

export const ChangePointDetectionContextProvider: FC = ({ children }) => {
  const { dataView } = useDataSource();
  const timeBuckets = useTimeBuckets();

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
    if (!params.metricField && metricFieldOptions.length === 1) {
      params.metricField = metricFieldOptions[0].name;
    }
    if (!params.splitField && splitFieldsOptions.length === 1) {
      params.splitField = splitFieldsOptions[0].name;
    }
    return params;
  }, [requestParamsFromUrl, metricFieldOptions, splitFieldsOptions]);

  const value = {
    timeBuckets,
    requestParams,
    updateRequestParams,
    metricFieldOptions,
    splitFieldsOptions,
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
