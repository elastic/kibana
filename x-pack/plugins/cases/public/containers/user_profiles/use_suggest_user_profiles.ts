/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import useDebounce from 'react-use/lib/useDebounce';
import { UserProfile } from '@kbn/security-plugin/common';
import { isEmpty } from 'lodash';
import { DEFAULT_USER_SIZE } from '../../../common/constants';
import * as i18n from '../translations';
import { useKibana, useToasts } from '../../common/lib/kibana';
import { ServerError } from '../../types';
import { USER_PROFILES_CACHE_KEY, USER_PROFILES_SUGGEST_CACHE_KEY } from '../constants';
import { suggestUserProfiles, SuggestUserProfilesArgs } from './api';

const DEBOUNCE_MS = 500;

export const useSuggestUserProfiles = ({
  name,
  owners,
  size = DEFAULT_USER_SIZE,
}: Omit<SuggestUserProfilesArgs, 'signal' | 'http'>) => {
  const { http } = useKibana().services;
  const [debouncedName, setDebouncedName] = useState(name);

  useDebounce(() => setDebouncedName(name), DEBOUNCE_MS, [name]);

  const toasts = useToasts();

  return useQuery<UserProfile[] | null, ServerError>(
    [
      USER_PROFILES_CACHE_KEY,
      USER_PROFILES_SUGGEST_CACHE_KEY,
      { name: debouncedName, owners, size },
    ],
    () => {
      if (isEmpty(name)) {
        return null;
      }

      const abortCtrlRef = new AbortController();
      return suggestUserProfiles({
        http,
        name: debouncedName,
        owners,
        size,
        signal: abortCtrlRef.signal,
      });
    },
    {
      retry: false,
      keepPreviousData: true,
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.ERROR_TITLE,
            }
          );
        }
      },
    }
  );
};

export type UseSuggestUserProfiles = UseQueryResult<UserProfile[] | null, ServerError>;
