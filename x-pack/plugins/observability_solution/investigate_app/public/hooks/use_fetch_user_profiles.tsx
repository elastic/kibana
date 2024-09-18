/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { UserProfile } from '@kbn/security-plugin/common';
import { useQuery } from '@tanstack/react-query';
import { Dictionary, keyBy } from 'lodash';
import { investigationKeys } from './query_key_factory';
import { useKibana } from './use_kibana';

export interface Params {
  profileIds: Set<string>;
}

export interface Response {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: Dictionary<UserProfile> | undefined;
}

export function useFetchUserProfiles({ profileIds }: Params) {
  const {
    core: {
      notifications: { toasts },
      userProfile,
    },
  } = useKibana();

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: investigationKeys.userProfiles(profileIds),
    queryFn: async () => {
      const userProfiles = await userProfile.bulkGet({ uids: profileIds });
      return keyBy(userProfiles, 'uid');
    },
    enabled: profileIds.size > 0,
    retry: false,
    cacheTime: Infinity,
    staleTime: Infinity,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.investigateApp.useFetchUserProfiles.errorTitle', {
          defaultMessage: 'Something went wrong while fetching user profiles',
        }),
      });
    },
  });

  return {
    data,
    isInitialLoading,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
