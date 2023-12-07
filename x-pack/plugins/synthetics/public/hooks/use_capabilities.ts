/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { SYNTHETICS_INDEX_PATTERN } from '../../common/constants';
import { MonitorLocations } from '../../common/runtime_types';

export const useCanEditSynthetics = () => {
  return !!useKibana().services?.application?.capabilities.uptime.save;
};

export const useCanUsePublicLocations = (monLocations?: MonitorLocations) => {
  const canUsePublicLocations =
    useKibana().services?.application?.capabilities.uptime.elasticManagedLocationsEnabled ?? true;
  const publicLocations = monLocations?.some((loc) => loc.isServiceManaged);

  if (!publicLocations) {
    return true;
  }

  return !!canUsePublicLocations;
};

export const useCanReadSyntheticsIndex = () => {
  const {
    services: { data: dataPublicPluginStart },
  } = useKibana<{ data: DataPublicPluginStart }>();

  const { data, loading, status } = useFetcher<
    Promise<{ canRead: boolean; error: undefined | unknown }>
  >(() => {
    return new Promise((resolve) => {
      dataPublicPluginStart.search
        .search(
          {
            terminate_after: 1,
            params: {
              index: SYNTHETICS_INDEX_PATTERN,
              size: 0,
            },
          },
          {
            legacyHitsTotal: false,
          }
        )
        .subscribe({
          next: (_) => {
            resolve({ canRead: true, error: undefined });
          },
          error: (error: { err: { statusCode: number } }) => {
            if (error.err?.statusCode >= 400 && error.err?.statusCode < 500) {
              resolve({ canRead: false, error });
            } else {
              resolve({ canRead: true, error });
            }
          },
        });
    });
  }, []);

  return {
    canRead: data?.canRead,
    error: data?.error,
    loading,
    status,
  };
};
