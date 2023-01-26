/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import useDebounce from 'react-use/lib/useDebounce';
import type { UserProfile } from '@kbn/security-plugin/common';
import { noop } from 'lodash';
import { DEFAULT_USER_SIZE, SEARCH_DEBOUNCE_MS } from '../../../common/constants';
import * as i18n from '../translations';
import { useKibana, useToasts } from '../../common/lib/kibana';
import type { ServerError } from '../../types';
import { casesQueriesKeys } from '../constants';
import type { SuggestUserProfilesArgs } from './api';
import { suggestUserProfiles } from './api';

type Props = Omit<SuggestUserProfilesArgs, 'signal' | 'http'> & { onDebounce?: () => void };

/**
 * Time in ms until the data become stale.
 * We set the stale time to one minute
 * to prevent fetching the same queries
 * while the user is typing.
 */

const STALE_TIME = 1000 * 60;

export const useSuggestUserProfiles = ({
  name,
  owners,
  size = DEFAULT_USER_SIZE,
  onDebounce = noop,
}: Props) => {
  const { http } = useKibana().services;
  const [debouncedName, setDebouncedName] = useState(name);

  useDebounce(
    () => {
      setDebouncedName(name);
      onDebounce();
    },
    SEARCH_DEBOUNCE_MS,
    [name]
  );

  const toasts = useToasts();

  return useQuery<UserProfile[], ServerError>(
    casesQueriesKeys.suggestUsers({ name: debouncedName, owners, size }),
    () => {
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
      staleTime: STALE_TIME,
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

export type UseSuggestUserProfiles = UseQueryResult<UserProfile[], ServerError>;
