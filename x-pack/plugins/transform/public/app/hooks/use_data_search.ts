/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { lastValueFrom } from 'rxjs';

import type { IKibanaSearchRequest } from '@kbn/data-plugin/common';

import { useAppDependencies } from '../app_dependencies';

export const useDataSearch = () => {
  const { data } = useAppDependencies();

  return useCallback(
    async (esSearchRequestParams: IKibanaSearchRequest['params'], abortSignal?: AbortSignal) => {
      try {
        const { rawResponse: resp } = await lastValueFrom(
          data.search.search(
            {
              params: esSearchRequestParams,
            },
            { abortSignal }
          )
        );

        return resp;
      } catch (error) {
        if (error.name === 'AbortError') {
          // ignore abort errors
        } else {
          return error;
        }
      }
    },
    [data]
  );
};
