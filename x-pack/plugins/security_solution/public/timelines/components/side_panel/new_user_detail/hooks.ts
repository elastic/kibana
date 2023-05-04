/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect } from 'react';
import * as i18n from './translations';
import type { ManagedUserTable, ObservedUserData, ObservedUserTable } from './types';
import type { AzureManagedUser } from '../../../../../common/search_strategy/security_solution/users/managed_details';

import {
  Direction,
  UsersQueries,
  NOT_EVENT_KIND_ASSET_FILTER,
} from '../../../../../common/search_strategy';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';
import { useObservedUserDetails } from '../../../../explore/users/containers/users/observed_details';
import { useFirstLastSeen } from '../../../../common/containers/use_first_last_seen';
import { useInstalledIntegrations } from '../../../../detections/components/rules/related_integrations/use_installed_integrations';
import { MANAGED_USER_INDEX, MANAGED_USER_PACKAGE_NAME, MANAGED_USER_QUERY_ID } from './constants';
import { useQueryInspector } from '../../../../common/components/page/manage_query';

export const useObservedUserItems = (userData: ObservedUserData): ObservedUserTable[] =>
  useMemo(
    () =>
      !userData.details
        ? []
        : [
            { label: i18n.USER_ID, values: userData.details.user?.id, field: 'user.id' },
            { label: 'Domain', values: userData.details.user?.domain, field: 'user.domain' },
            {
              label: i18n.MAX_ANOMALY_SCORE_BY_JOB,
              field: 'anomalies',
              values: userData.anomalies,
            },
            {
              label: i18n.FIRST_SEEN,
              values: userData.firstSeen.date ? [userData.firstSeen.date] : undefined,
              field: '@timestamp',
            },
            {
              label: i18n.LAST_SEEN,
              values: userData.lastSeen.date ? [userData.lastSeen.date] : undefined,
              field: '@timestamp',
            },
            {
              label: i18n.OPERATING_SYSTEM_TITLE,
              values: userData.details.host?.os?.name,
              field: 'host.os.name',
            },
            {
              label: i18n.FAMILY,
              values: userData.details.host?.os?.family,
              field: 'host.os.family',
            },
            { label: i18n.IP_ADDRESSES, values: userData.details.host?.ip, field: 'host.ip' },
          ],
    [userData.details, userData.anomalies, userData.firstSeen, userData.lastSeen]
  );

export const useManagedUserItems = (
  managedUserDetails?: AzureManagedUser
): ManagedUserTable[] | null =>
  useMemo(
    () =>
      !managedUserDetails
        ? null
        : [
            {
              label: i18n.USER_ID,
              value: managedUserDetails.user.id,
              field: 'user.id',
            },
            {
              label: i18n.FULL_NAME,
              value: managedUserDetails.user.full_name,
              field: 'user.full_name',
            },
            {
              label: i18n.FIRST_NAME,
              value: managedUserDetails.user.first_name,
            },
            {
              label: i18n.LAST_NAME,
              value: managedUserDetails.user.last_name,
            },
            { label: i18n.PHONE, value: managedUserDetails.user.phone?.join(', ') },
          ],
    [managedUserDetails]
  );

export const useManagedUser = (userName: string) => {
  const { to, from, isInitializing, deleteQuery, setQuery } = useGlobalTime();
  const {
    loading: loadingManagedUser,
    result: { userDetails: managedUserDetails },
    search,
    refetch,
    inspect,
  } = useSearchStrategy<UsersQueries.managedDetails>({
    factoryQueryType: UsersQueries.managedDetails,
    initialResult: {},
    errorMessage: i18n.FAIL_MANAGED_USER,
  });

  useEffect(() => {
    if (!isInitializing) {
      search({
        defaultIndex: MANAGED_USER_INDEX,
        factoryQueryType: UsersQueries.managedDetails,
        userName,
      });
    }
  }, [from, search, to, userName, isInitializing]);

  const { data: installedIntegrations, isLoading: loadingIntegrations } = useInstalledIntegrations({
    packages: [MANAGED_USER_PACKAGE_NAME],
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
          packageName === MANAGED_USER_PACKAGE_NAME && isEnabled
      ),
    [installedIntegrations]
  );

  const [loadingFirstSeen, { firstSeen }] = useFirstLastSeen({
    field: 'user.name',
    value: userName,
    defaultIndex: MANAGED_USER_INDEX,
    order: Direction.asc,
  });

  const [loadingLastSeen, { lastSeen }] = useFirstLastSeen({
    field: 'user.name',
    value: userName,
    defaultIndex: MANAGED_USER_INDEX,
    order: Direction.desc,
  });

  return useMemo(
    () => ({
      details: managedUserDetails,
      isLoading: loadingManagedUser || loadingIntegrations,
      isIntegrationEnabled,
      firstSeen: {
        date: firstSeen,
        isLoading: loadingFirstSeen,
      },
      lastSeen: { date: lastSeen, isLoading: loadingLastSeen },
    }),
    [
      firstSeen,
      isIntegrationEnabled,
      loadingIntegrations,
      lastSeen,
      loadingFirstSeen,
      loadingLastSeen,
      loadingManagedUser,
      managedUserDetails,
    ]
  );
};

export const useObservedUser = (userName: string) => {
  const { selectedPatterns } = useSourcererDataView();
  const { to, from, isInitializing, deleteQuery, setQuery } = useGlobalTime();

  const [loadingObservedUser, { userDetails: observedUserDetails, inspect, refetch, id: queryId }] =
    useObservedUserDetails({
      endDate: to,
      startDate: from,
      userName,
      indexNames: selectedPatterns,
      skip: isInitializing,
    });

  useQueryInspector({
    deleteQuery,
    inspect,
    refetch,
    setQuery,
    queryId,
    loading: loadingObservedUser,
  });

  const [loadingFirstSeen, { firstSeen }] = useFirstLastSeen({
    field: 'user.name',
    value: userName,
    defaultIndex: selectedPatterns,
    order: Direction.asc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
  });

  const [loadingLastSeen, { lastSeen }] = useFirstLastSeen({
    field: 'user.name',
    value: userName,
    defaultIndex: selectedPatterns,
    order: Direction.desc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
  });

  return useMemo(
    () => ({
      details: observedUserDetails,
      isLoading: loadingObservedUser,
      firstSeen: {
        date: firstSeen,
        isLoading: loadingFirstSeen,
      },
      lastSeen: { date: lastSeen, isLoading: loadingLastSeen },
    }),
    [
      firstSeen,
      lastSeen,
      loadingFirstSeen,
      loadingLastSeen,
      loadingObservedUser,
      observedUserDetails,
    ]
  );
};
