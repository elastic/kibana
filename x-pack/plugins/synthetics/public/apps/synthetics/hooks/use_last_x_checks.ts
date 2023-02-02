/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useEsSearch, createEsParams } from '@kbn/observability-plugin/public';
import { Ping } from '../../../../common/runtime_types';

import {
  EXCLUDE_RUN_ONCE_FILTER,
  getLocationFilter,
  SUMMARY_FILTER,
} from '../../../../common/constants/client_defaults';
import { selectServiceLocationsState } from '../state';
import { useSyntheticsRefreshContext } from '../contexts/synthetics_refresh_context';
import { SYNTHETICS_INDEX_PATTERN, UNNAMED_LOCATION } from '../../../../common/constants';

export function useLastXChecks<Fields>({
  monitorId,
  locationId,
  fields = ['*'],
  size = 50,
}: {
  monitorId: string;
  locationId: string;
  fields?: string[];
  size?: number;
}) {
  const { lastRefresh } = useSyntheticsRefreshContext();
  const { locationsLoaded, locations } = useSelector(selectServiceLocationsState);

  const params = createEsParams({
    index: locationsLoaded ? SYNTHETICS_INDEX_PATTERN : '', // don't run query until locations are loaded
    body: {
      size,
      query: {
        bool: {
          filter: [
            SUMMARY_FILTER,
            EXCLUDE_RUN_ONCE_FILTER,
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
      sort: [{ '@timestamp': 'desc' }],
      fields,
    },
  });

  const { data } = useEsSearch<Ping, typeof params>(params, [lastRefresh], {
    name: 'getLastXMonitorRunsByLocation',
  });

  const dataAsJSON = JSON.stringify(data?.hits?.hits);

  return useMemo(() => {
    return {
      hits: (data?.hits?.hits.map((hit) => hit.fields) as Fields[]) || [],
      loading: !data,
    };
  }, [dataAsJSON]); // eslint-disable-line react-hooks/exhaustive-deps
}
