/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { APIRoutes } from '../../../common/routes';
import { GetIndicesResponse } from '../../../common/types';

import { QueryKeys } from '../../constants';
import { useKibana } from '../use_kibana';

export const useIndices = (query: string | undefined) => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: [QueryKeys.FetchIndices, { filter: query && query.length > 0 ? query : 'all' }],
    queryFn: () =>
      http.get<GetIndicesResponse>(APIRoutes.GET_INDICES, {
        query: { search_query: query },
      }),
  });
};
