/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';

import { MutationKeys } from '../../constants';
import { useKibana } from '../use_kibana';

export const useCreateIndex = () => {
  const { http } = useKibana().services;

  return useMutation({
    mutationKey: [MutationKeys.CreateIndex],
    mutationFn: async (indexName: string) => {
      return await http.put<{}>('/internal/index_management/indices/create', {
        body: JSON.stringify({ indexName }),
      });
    },
  });
};
