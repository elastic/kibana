/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { useEffect } from 'react';
import { throwErrors, createPlainError } from '../../../../../common/runtime_types';
import { useHTTPRequest } from '../../../../hooks/use_http_request';
import {
  InventoryMetaResponseRT,
  InventoryMetaResponse,
} from '../../../../../common/http_api/inventory_meta_api';

export function useProcessList(hostname: string, timefield: string) {
  const decodeResponse = (response: any) => {
    return pipe(
      InventoryMetaResponseRT.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };

  const { error, loading, response, makeRequest } = useHTTPRequest<InventoryMetaResponse>(
    '/api/infra/metrics_api',
    'POST',
    generateRequest(hostname, timefield),
    decodeResponse
  );

  useEffect(() => {
    makeRequest();
  }, [makeRequest]);

  return {
    error,
    loading,
    accounts: response ? response.accounts : [],
    regions: response ? response.regions : [],
    makeRequest,
  };
}

const generateRequest = (hostname: string, timefield: string = '@timestamp') => {
  const to = Date.now();
  const from = to - 15 * 60 * 1000; // 15 minutes
  return JSON.stringify({
    timerange: {
      field: timefield,
      from,
      to,
      interval: 'modules',
    },
    modules: ['system.cpu', 'system.memory'],
    groupBy: ['system.process.cmdline'],
    filter: [{ term: { 'host.name': hostname } }],
    indexPattern: 'metricbeat-*',
    limit: 9,
    metrics: [
      {
        id: 'cpu',
        aggregations: {
          cpu: {
            avg: {
              field: 'system.process.cpu.total.norm.pct',
            },
          },
        },
      },
      {
        id: 'memory',
        aggregations: {
          memory: {
            avg: {
              field: 'system.process.memory.rss.pct',
            },
          },
        },
      },
      {
        id: 'meta',
        aggregations: {
          meta: {
            top_hits: {
              size: 1,
              sort: [{ '@timestamp': { order: 'desc' } }],
              _source: ['system.process.cpu.start_time', 'system.process.state'],
            },
          },
        },
      },
    ],
  });
};
