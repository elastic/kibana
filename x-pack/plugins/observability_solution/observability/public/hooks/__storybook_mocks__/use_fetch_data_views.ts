/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseFetchDataViewsResponse } from '../use_fetch_data_views';

export const useFetchDataViews = (): UseFetchDataViewsResponse => {
  return {
    isLoading: false,
    isError: false,
    isSuccess: true,
    data: Array(20)
      .fill(0)
      .map((_, i) => ({
        id: `dataview-${i}`,
        title: `dataview-${i}`,
        type: 'foo',
      })),
  };
};
