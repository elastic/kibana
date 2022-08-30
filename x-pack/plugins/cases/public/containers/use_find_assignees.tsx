/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserProfile } from '@kbn/user-profile-components';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { DEFAULT_USER_SIZE, SEARCH_DEBOUNCE_MS } from '../../common/constants';
import { useToasts } from '../common/lib/kibana';
import { ServerError } from '../types';
import { findAssignees, FindAssigneesProps } from './api';
import { CASE_ASSIGNEES_CACHE_KEY } from './constants';
import * as i18n from './translations';

export const useFindAssignees = ({
  searchTerm,
  owners,
  size = DEFAULT_USER_SIZE,
  cacheKey,
}: {
  cacheKey?: string;
} & Omit<FindAssigneesProps, 'signal'>) => {
  const toasts = useToasts();

  const [debounceSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useDebounce(() => setDebouncedSearchTerm(searchTerm), SEARCH_DEBOUNCE_MS, [searchTerm]);

  const key = [
    ...(cacheKey ? [cacheKey] : []),
    CASE_ASSIGNEES_CACHE_KEY,
    { name: debounceSearchTerm, owners, size },
  ];

  return useQuery(
    key,
    () => {
      const abortCtrl = new AbortController();
      return findAssignees({
        signal: abortCtrl.signal,
        size,
        owners,
        searchTerm: debounceSearchTerm,
      });
    },
    {
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: i18n.ERROR_TITLE }
          );
        }
      },
    }
  );
};

export type UseFindAssignees = UseQueryResult<UserProfile[], ServerError>;
