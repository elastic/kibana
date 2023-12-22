/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import { UseFetchDataViewsResponse } from '../use_fetch_data_views';

export const useFetchDataViews = (): UseFetchDataViewsResponse => {
  return {
    isLoading: false,
    isError: false,
    isSuccess: true,
    data: Array(20)
      .fill(0)
      .map((_, i) => ({
        title: `dataview-${i}`,
        type: 'foo',
        getName: () => `dataview-${i}`,
        getIndexPattern: () => `.index-pattern-dataview-${i}`,
      })) as DataView[],
  };
};
