/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../utils/kibana_react';
import { findMaintenanceWindows } from '../services/maintenance_windows_api/find';
import { type MaintenanceWindowStatus } from '../../common';

interface UseFindMaintenanceWindowsProps {
  enabled?: boolean;
  // filterOptions?: Partial<FilterOptions>;
  page: number;
  perPage: number;
  // search: string;
  // statuses: MaintenanceWindowStatus[]
  filters: { searchText: string; selectedStatuses: MaintenanceWindowStatus[] }
}

export const useFindMaintenanceWindows = (
  params: UseFindMaintenanceWindowsProps
) => {
  const { enabled = true, page, perPage, filters } = params;

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryFn = () => {
    // remove http from params
    return findMaintenanceWindows({
      http,
      // filterOptions: {
      //   ...MAINTENANCE_WINDOW_DEFAULT_FILTER_OPTIONS,
      //   ...(filterOptions ?? {}),
      // },
      page,
      perPage,
      // statuses,
      search: filters.searchText,
      // queryParams: {
      //   ...MAINTENANCE_WINDOW_DEFAULT_QUERY_PARAMS,
      //   ...({ page, perPage } ?? {}), //cannot be
      // },
    });
  };

  const onErrorFn = (error: Error) => {
    if (error) {
      toasts.addDanger(
        // move to translate file
        i18n.translate('xpack.alerting.maintenanceWindowsListFailure', {
          defaultMessage: 'Unable to load maintenance windows.',
        })
      );
    }
  };

  const queryKey = [
    'findMaintenanceWindows',
    ...(page ? [page] : []),
    ...(perPage ? [perPage] : []),
    // ...(statuses ? [statuses] : []), // add 2 last lines and everything failed!!!
    ...(filters.searchText ? [filters.searchText] : []), // add 2 last lines and everything failed!!!
  ];

  const {
    isLoading,
    isFetching,
    isInitialLoading,
    data,
    refetch,
  } = useQuery({
    queryKey,
    queryFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    retry: false,
    cacheTime: 0,
    enabled,
  });

  return {
    data: data || { maintenanceWindows: [], total: 0 },
    isLoading: enabled && (isLoading || isFetching),
    isInitialLoading,
    refetch,
  };
};
