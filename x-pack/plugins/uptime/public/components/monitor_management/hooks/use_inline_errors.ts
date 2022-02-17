/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import moment from 'moment';
import { useMemo } from 'react';
import { monitorManagementListSelector, selectDynamicSettings } from '../../../state/selectors';
import { useEsSearch } from '../../../../../observability/public';
import { Ping } from '../../../../common/runtime_types';
import { EXCLUDE_RUN_ONCE_FILTER } from '../../../../common/constants/client_defaults';
import { useUptimeRefreshContext } from '../../../contexts/uptime_refresh_context';

export function useInlineErrors(onlyInvalidMonitors?: boolean) {
  const monitorList = useSelector(monitorManagementListSelector);

  const { settings } = useSelector(selectDynamicSettings);

  const { lastRefresh } = useUptimeRefreshContext();

  const configIds = monitorList.list.monitors.map((monitor) => monitor.id);

  const doFetch = configIds.length > 0 || onlyInvalidMonitors;

  const { data, loading } = useEsSearch(
    {
      index: doFetch ? settings?.heartbeatIndices : '',
      body: {
        size: 1000,
        query: {
          bool: {
            filter: [
              ...(onlyInvalidMonitors
                ? [
                    {
                      terms: {
                        config_id: configIds,
                      },
                    },
                  ]
                : []),

              {
                exists: {
                  field: 'summary',
                },
              },
              {
                exists: {
                  field: 'error',
                },
              },
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      match_phrase: {
                        'error.message': 'journey did not finish executing',
                      },
                    },
                    {
                      match_phrase: {
                        'error.message': 'ReferenceError:',
                      },
                    },
                  ],
                },
              },
              {
                range: {
                  'monitor.timespan': {
                    lte: moment().toISOString(),
                    gte: moment().subtract(5, 'minutes').toISOString(),
                  },
                },
              },
              EXCLUDE_RUN_ONCE_FILTER,
            ],
          },
        },
        collapse: { field: 'config_id' },
        sort: [{ '@timestamp': 'desc' }],
      },
    },
    [settings?.heartbeatIndices, monitorList, lastRefresh],
    { name: 'getInvalidMonitors' }
  );

  return useMemo(() => {
    const errorSummaries = data?.hits.hits.map(({ _source: source }) => ({
      ...(source as Ping),
      timestamp: (source as any)['@timestamp'],
    }));

    return { loading, errorSummaries };
  }, [data, loading]);
}
