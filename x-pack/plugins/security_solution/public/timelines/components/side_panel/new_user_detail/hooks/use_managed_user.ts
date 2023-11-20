/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useInstalledIntegrations } from '../../../../../detections/components/rules/related_integrations/use_installed_integrations';
import { ManagedUserDatasetKey } from '../../../../../../common/search_strategy/security_solution/users/managed_details';
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

export const useManagedUser = (userName: string) => {
  const { to, from, isInitializing, deleteQuery, setQuery } = useGlobalTime();
  const spaceId = useSpaceId();
  const {
    loading: loadingManagedUser,
    result: { users: managedUserDetails },
    search,
    refetch,
    inspect,
  } = useSearchStrategy<UsersQueries.managedDetails>({
    factoryQueryType: UsersQueries.managedDetails,
    initialResult: {
      users: {
        [ManagedUserDatasetKey.ENTRA]: undefined,
        [ManagedUserDatasetKey.OKTA]: undefined,
      },
    },
    errorMessage: i18n.FAIL_MANAGED_USER,
  });

  const defaultIndex = useMemo(
    () => (spaceId ? [getEntraUserIndex(spaceId), getOktaUserIndex(spaceId)] : []),
    [spaceId]
  );

  useEffect(() => {
    if (!isInitializing && defaultIndex.length > 0) {
      search({
        defaultIndex,
        userName,
      });
    }
  }, [from, search, to, userName, isInitializing, defaultIndex]);

  const { data: installedIntegrations, isLoading: loadingIntegrations } = useInstalledIntegrations({
    packages: [ENTRA_ID_PACKAGE_NAME, OKTA_PACKAGE_NAME],
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
          isEnabled && (packageName === ENTRA_ID_PACKAGE_NAME || packageName === OKTA_PACKAGE_NAME)
      ),
    [installedIntegrations]
  );

  return useMemo(
    () => ({
      details: managedUserDetails,
      isLoading: loadingManagedUser || loadingIntegrations,
      isIntegrationEnabled,
    }),
    [isIntegrationEnabled, loadingIntegrations, loadingManagedUser, managedUserDetails]
  );
};
