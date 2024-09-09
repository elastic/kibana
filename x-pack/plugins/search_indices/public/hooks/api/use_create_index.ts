/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';

import { POST_CREATE_INDEX_ROUTE } from '../../../common/routes';
import { CreateIndexRequest, CreateIndexResponse } from '../../../common/types';

import { useKibana } from '../use_kibana';

export const useCreateIndex = () => {
  const { http } = useKibana().services;

  const { mutate: createIndex, ...rest } = useMutation({
    mutationKey: ['searchIndicesCreateIndex'],
    mutationFn: async (input: CreateIndexRequest) =>
      http.post<CreateIndexResponse>(POST_CREATE_INDEX_ROUTE, {
        body: JSON.stringify(input),
      }),
  });

  return { createIndex, ...rest };
};
