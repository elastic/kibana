/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import moment from 'moment';
import { useMemo } from 'react';
import { monitorManagementListSelector } from '../../../state/selectors';
import { useEsSearch } from '../../../../../observability/public';
import { Ping } from '../../../../common/runtime_types';
import { EXCLUDE_RUN_ONCE_FILTER } from '../../../../common/constants/client_defaults';
import { useUptimeRefreshContext } from '../../../contexts/uptime_refresh_context';
import { useInlineErrorsCount } from './use_inline_errors_count';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../common/constants';

const sortFieldMap: Record<string, string> = {
  ['name.keyword']: 'monitor.name',
  ['urls.keyword']: 'url.full',
  ['type.keyword']: 'monitor.type',
  '@timestamp': '@timestamp',
};

export const getInlineErrorFilters = () => [
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
];

export function useInlineErrors({
  onlyInvalidMonitors,
  sortField = '@timestamp',
  sortOrder = 'desc',
}: {
  onlyInvalidMonitors?: boolean;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const monitorList = useSelector(monitorManagementListSelector);

  const { lastRefresh } = useUptimeRefreshContext();

  const configIds = monitorList.list.monitors.map((monitor) => monitor.id);

  const doFetch = configIds.length > 0 || onlyInvalidMonitors;

  const { data, loading } = useEsSearch(
    {
      index: doFetch ? SYNTHETICS_INDEX_PATTERN : '',
      body: {
        size: 1000,
        query: {
          bool: {
            filter: getInlineErrorFilters(),
          },
        },
        collapse: { field: 'config_id' },
        sort: [{ [sortFieldMap[sortField]]: sortOrder }],
      },
    },
    [monitorList, lastRefresh, doFetch, sortField, sortOrder],
    { name: 'getInvalidMonitors' }
  );

  const { count, loading: countLoading } = useInlineErrorsCount();

  return useMemo(() => {
    const errorSummaries = data?.hits.hits.map(({ _source: source }) => ({
      ...(source as Ping),
      timestamp: (source as any)['@timestamp'],
    }));

    return { loading: loading || countLoading, errorSummaries, count };
  }, [count, countLoading, data, loading]);
}
