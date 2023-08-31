/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../lib/kibana';
import { SAVED_SEARCH_QUERY_KEYS } from './constants';

export const useGetSavedSearchById = (savedSearchId: string) => {
  const {
    services: { savedSearch: savedSearchService },
  } = useKibana();

  const getSavedSearch = () =>
    useQuery({
      queryKey: [SAVED_SEARCH_QUERY_KEYS.GET_SAVED_SEARCH_BY_ID, savedSearchId],
      queryFn: () => savedSearchService.get(savedSearchId),
    });

  return savedSearch;
};
