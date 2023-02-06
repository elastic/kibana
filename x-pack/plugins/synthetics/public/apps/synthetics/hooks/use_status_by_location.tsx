/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch, useTheme } from '@kbn/observability-plugin/public';
import { useMemo } from 'react';
import { useLocations } from './use_locations';
import { EncryptedSyntheticsSavedMonitor, Ping } from '../../../../common/runtime_types';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  SUMMARY_FILTER,
} from '../../../../common/constants/client_defaults';
import { SYNTHETICS_INDEX_PATTERN, UNNAMED_LOCATION } from '../../../../common/constants';
import { useSyntheticsRefreshContext } from '../contexts';

export type LocationsStatus = Array<{ status: string; id: string; label: string; color: string }>;

export function useStatusByLocation({
  configId,
  monitorLocations,
}: {
  configId: string;
  monitorLocations?: EncryptedSyntheticsSavedMonitor['locations'];
}) {
  const theme = useTheme();

  const { lastRefresh } = useSyntheticsRefreshContext();

  const { locations: allLocations } = useLocations();

  const { data, loading } = useEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              SUMMARY_FILTER,
              EXCLUDE_RUN_ONCE_FILTER,
              {
                term: {
                  config_id: configId,
                },
              },
            ],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
        aggs: {
          locations: {
            terms: {
              field: 'observer.geo.name',
              missing: UNNAMED_LOCATION,
              size: 1000,
            },
            aggs: {
              summary: {
                top_hits: {
                  size: 1,
                },
              },
            },
          },
        },
      },
    },
    [lastRefresh, configId],
    { name: 'getMonitorStatusByLocation' }
  );

  return useMemo(() => {
    const getColor = (status: string) => {
      switch (status) {
        case 'up':
          return theme.eui.euiColorVis0;
        case 'down':
          return theme.eui.euiColorVis9;
        default:
          return 'subdued';
      }
    };

    const locationPings = (data?.aggregations?.locations.buckets ?? []).map((loc) => {
      return loc.summary.hits.hits?.[0]._source as Ping;
    });
    const locations = (monitorLocations ?? [])
      .map((loc) => {
        const fullLoc = allLocations.find((l) => l.id === loc.id);
        if (fullLoc) {
          const ping = locationPings.find((p) => p.observer?.geo?.name === fullLoc?.label);
          const status = ping ? (ping.summary?.down ?? 0 > 0 ? 'down' : 'up') : 'unknown';
          return {
            status,
            id: fullLoc?.id,
            label: fullLoc?.label,
            color: getColor(status),
          };
        }
      })
      .filter(Boolean) as LocationsStatus;

    return {
      locations,
      loading,
    };
  }, [
    allLocations,
    data?.aggregations?.locations.buckets,
    loading,
    monitorLocations,
    theme.eui.euiColorVis0,
    theme.eui.euiColorVis9,
  ]);
}
