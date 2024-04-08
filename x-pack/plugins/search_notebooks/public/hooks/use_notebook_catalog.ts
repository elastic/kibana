/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';

import { NotebookCatalog } from '../../common/types';
import { useKibanaServices } from './use_kibana';

export const useNotebooksCatalog = () => {
  const { http } = useKibanaServices();
  return useQuery({
    queryKey: ['fetchNotebooksCatalog'],
    queryFn: () => http.get<NotebookCatalog>('/internal/search_notebooks/notebooks'),
  });
};
