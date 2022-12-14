/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { useEsSearch } from '@kbn/observability-plugin/public';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../common/constants';
import { Ping } from '../../../../common/runtime_types';

export const useMonitorDetail = (
  configId: string,
  location: string
): { data?: Ping; loading?: boolean } => {
  const params = {
    index: SYNTHETICS_INDEX_PATTERN,
    body: {
      size: 1,
      query: {
        bool: {
          filter: [
            {
              term: {
                config_id: configId,
              },
            },
            {
              term: {
                'observer.geo.name': location,
              },
            },
            {
              exists: {
                field: 'summary',
              },
            },
          ],
        },
      },
      sort: [{ '@timestamp': 'desc' }],
    },
  };
  const { data: result, loading } = useEsSearch<Ping & { '@timestamp': string }, SearchRequest>(
    params,
    [configId, location],
    {
      name: 'getMonitorStatusByLocation',
    }
  );

  if (!result || result.hits.hits.length !== 1) return { data: undefined, loading };
  return {
    data: { ...result.hits.hits[0]._source, timestamp: result.hits.hits[0]._source['@timestamp'] },
    loading,
  };
};
