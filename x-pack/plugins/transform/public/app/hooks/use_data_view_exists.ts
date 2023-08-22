/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { ErrorType } from '@kbn/ml-error-utils';

import { TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';

import { useAppDependencies } from '../app_dependencies';

export const useDataViewExists = (indexName?: string, enabled?: boolean, initialData?: boolean) => {
  const {
    data: { dataViews: dataViewsContract },
  } = useAppDependencies();

  return useQuery<boolean, ErrorType>(
    [TRANSFORM_REACT_QUERY_KEYS.DATA_VIEW_EXISTS, indexName],
    async () => {
      if (indexName === undefined) {
        return false;
      }

      return (await dataViewsContract.find(indexName)).some(({ title }) => title === indexName);
    },
    { enabled, initialData }
  );
};
