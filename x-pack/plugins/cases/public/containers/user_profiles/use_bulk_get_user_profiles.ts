/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { UserProfileWithAvatar } from '@kbn/user-profile-components';
import * as i18n from '../translations';
import { useKibana, useToasts } from '../../common/lib/kibana';
import { ServerError } from '../../types';
import { USER_PROFILES_CACHE_KEY, USER_PROFILES_BULK_GET_CACHE_KEY } from '../constants';
import { bulkGetUserProfiles } from './api';

export const useBulkGetUserProfiles = ({ uids }: { uids: string[] }) => {
  const { security } = useKibana().services;

  const toasts = useToasts();

  return useQuery<Map<string, UserProfileWithAvatar>, ServerError>(
    [USER_PROFILES_CACHE_KEY, USER_PROFILES_BULK_GET_CACHE_KEY, uids],
    async () => {
      if (uids.length <= 0 || !security) {
        return new Map<string, UserProfileWithAvatar>();
      }

      const profiles = await bulkGetUserProfiles({ security, uids });
      return profiles.reduce<Map<string, UserProfileWithAvatar>>((acc, profile) => {
        acc.set(profile.uid, profile);
        return acc;
      }, new Map<string, UserProfileWithAvatar>());
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

export type UseBulkGetUserProfiles = UseQueryResult<
  Map<string, UserProfileWithAvatar>,
  ServerError
>;
