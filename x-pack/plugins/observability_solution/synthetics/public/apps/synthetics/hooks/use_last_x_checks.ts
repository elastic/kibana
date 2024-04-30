/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { createEsParams } from '@kbn/observability-shared-plugin/public';
import { useReduxEsSearch } from './use_redux_es_search';
import { Ping } from '../../../../common/runtime_types';

import {
  EXCLUDE_RUN_ONCE_FILTER,
  getLocationFilter,
  FINAL_SUMMARY_FILTER,
} from '../../../../common/constants/client_defaults';
import { selectServiceLocationsState } from '../state';
import { useSyntheticsRefreshContext } from '../contexts/synthetics_refresh_context';
import { SYNTHETICS_INDEX_PATTERN, UNNAMED_LOCATION } from '../../../../common/constants';

export const getTimeRangeFilter = (schedule: string) => {
  const inMinutes = Number(schedule);
  const fiftyChecksInMinutes = inMinutes * 50;
  const hours = Math.ceil(fiftyChecksInMinutes / 60);
  return {
    range: {
      '@timestamp': {
        gte: `now-${hours}h`,
        lte: 'now',
      },
    },
  };
};

export function useLastXChecks<Fields>({
  monitorId,
  locationId,
  fields = ['*'],
  size = 50,
  timestamp,
  schedule,
}: {
  monitorId: string;
  schedule: string;
  locationId: string;
  timestamp?: string;
  fields?: string[];
  size?: number;
}) {
  const { lastRefresh } = useSyntheticsRefreshContext();
  const { locationsLoaded, locations } = useSelector(selectServiceLocationsState);

  const params = createEsParams({
    index: SYNTHETICS_INDEX_PATTERN,
    body: {
      size,
      query: {
        bool: {
          filter: [
            FINAL_SUMMARY_FILTER,
            EXCLUDE_RUN_ONCE_FILTER,
            getTimeRangeFilter(schedule),
            {
              term: {
                'monitor.id': monitorId,
              },
            },
          ],
          ...getLocationFilter({
            locationId,
            locationName:
              locations.find((location) => location.id === locationId)?.label || UNNAMED_LOCATION,
          }),
        },
      },
      _source: false,
      sort: [{ '@timestamp': 'desc' }],
      fields,
    },
  });

  const { data } = useReduxEsSearch<Ping, typeof params>(params, [lastRefresh], {
    name: `zGetLastXChecks/${monitorId}/${locationId}`,
    isRequestReady: locationsLoaded && Boolean(timestamp), // don't run query until locations are loaded
  });

  const dataAsJSON = JSON.stringify(data?.hits?.hits);

  return useMemo(() => {
    return {
      hits: (data?.hits?.hits.map((hit) => hit.fields) as Fields[]) || [],
      loading: !data,
    };
  }, [dataAsJSON]); // eslint-disable-line react-hooks/exhaustive-deps
}
