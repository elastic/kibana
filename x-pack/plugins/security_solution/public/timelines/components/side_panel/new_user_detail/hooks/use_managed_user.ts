/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useInstalledIntegrations } from '../../../../../detections/components/rules/related_integrations/use_installed_integrations';
import { UsersQueries } from '../../../../../../common/search_strategy';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import { useSearchStrategy } from '../../../../../common/containers/use_search_strategy';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../../../common/components/page/manage_query';
import {
  ENTRA_ID_PACKAGE_NAME,
  OKTA_PACKAGE_NAME,
  getEntraUserIndex,
  getOktaUserIndex,
  MANAGED_USER_QUERY_ID,
} from '../constants';
import * as i18n from '../translations';
import type { ObserverUser } from './use_observed_user';

const packages = [ENTRA_ID_PACKAGE_NAME, OKTA_PACKAGE_NAME];

export const useManagedUser = (userName: string, observedUser: ObserverUser) => {
  const { to, from, isInitializing, deleteQuery, setQuery } = useGlobalTime();
  const spaceId = useSpaceId();
  const {
    loading: loadingManagedUser,
    result: { users: managedUserData },
    search,
    refetch,
    inspect,
  } = useSearchStrategy<UsersQueries.managedDetails>({
    factoryQueryType: UsersQueries.managedDetails,
    initialResult: {
      users: {},
    },
    errorMessage: i18n.FAIL_MANAGED_USER,
  });

  const defaultIndex = useMemo(
    () => (spaceId ? [getEntraUserIndex(spaceId), getOktaUserIndex(spaceId)] : []),
    [spaceId]
  );

  useEffect(() => {
    if (!isInitializing && defaultIndex.length > 0 && !observedUser.isLoading && userName) {
      search({
        defaultIndex,
        userEmail: observedUser.details.user?.email,
        userName,
      });
    }
  }, [
    from,
    search,
    to,
    isInitializing,
    defaultIndex,
    userName,
    observedUser.isLoading,
    observedUser.details.user?.email,
  ]);

  const { data: installedIntegrations, isLoading: loadingIntegrations } = useInstalledIntegrations({
    packages,
  });

  useQueryInspector({
    deleteQuery,
    inspect,
    refetch,
    setQuery,
    queryId: MANAGED_USER_QUERY_ID,
    loading: loadingManagedUser,
  });

  const isIntegrationEnabled = useMemo(
    () =>
      !!installedIntegrations?.some(
        ({ package_name: packageName, is_enabled: isEnabled }) =>
          isEnabled && packages.includes(packageName)
      ),
    [installedIntegrations]
  );

  return useMemo(
    () => ({
      data: managedUserData,
      isLoading: loadingManagedUser || loadingIntegrations,
      isIntegrationEnabled,
    }),
    [isIntegrationEnabled, loadingIntegrations, loadingManagedUser, managedUserData]
  );
};
