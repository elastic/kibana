/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { IKibanaSearchRequest } from '@kbn/data-plugin/common';

import { TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';

import { useAppDependencies } from '../app_dependencies';

export const useDataSearch = (
  esSearchRequestParams: IKibanaSearchRequest['params'],
  enabled?: boolean
) => {
  const { data } = useAppDependencies();

  return useQuery<estypes.SearchResponse>(
    [TRANSFORM_REACT_QUERY_KEYS.DATA_SEARCH, esSearchRequestParams],
    async ({ signal }) => {
      const { rawResponse: resp } = await lastValueFrom(
        data.search.search(
          {
            params: esSearchRequestParams,
          },
          { abortSignal: signal }
        )
      );

      return resp;
    },
    { enabled }
  );
};
