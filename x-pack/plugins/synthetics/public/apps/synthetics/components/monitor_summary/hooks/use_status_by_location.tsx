/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useEsSearch } from '@kbn/observability-plugin/public';
import { useParams } from 'react-router-dom';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  getTimeSpanFilter,
  SUMMARY_FILTER,
} from '../../../../../../common/constants/client_defaults';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';

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

export function useStatusByLocation() {
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { monitorId } = useParams<{ monitorId: string }>();

  const { data } = useEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
      body: {
        size: 1000,
        query: {
          bool: {
            filter: [
              SUMMARY_FILTER,
              EXCLUDE_RUN_ONCE_FILTER,
              getTimeSpanFilter(),
              {
                term: {
                  config_id: monitorId,
                },
              },
            ],
          },
        },
        collapse: { field: 'observer.geo.name' },
        sort: [{ '@timestamp': 'desc' }],
      },
    },
    [lastRefresh, monitorId],
    { name: 'getMonitorStatusByLocation' }
  );
}
