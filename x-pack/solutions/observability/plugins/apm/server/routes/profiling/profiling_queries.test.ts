/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery } from '@kbn/observability-plugin/server';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { environmentQuery } from '../../../common/utils/environment_query';
import {
  getHostsProfilingEventsQuery,
  getProfilingEventsQueryFromKuery,
  getTransactionsProfilingQuery,
} from './profiling_queries';

const range = { start: 1000, end: 1900 };
const timeRangeFilter = {
  range: { '@timestamp': { gte: '1000', lt: '1900', format: 'epoch_second' } },
};

describe('getTransactionsProfilingQuery', () => {
  const filters = {
    kuery: 'transaction.result : "HTTP 2xx"',
    serviceName: 'my-service',
    transactionName: 'GET /orders',
    transactionType: 'request',
  };

  it('filters the transactions by the kuery, the APM fields and the time range in seconds', () => {
    expect(
      getTransactionsProfilingQuery({ ...range, ...filters, environment: 'production' })
    ).toEqual({
      bool: {
        filter: [
          ...kqlQuery(filters.kuery),
          { term: { 'service.name': 'my-service' } },
          { term: { 'transaction.name': 'GET /orders' } },
          ...environmentQuery('production'),
          { term: { 'transaction.type': 'request' } },
          timeRangeFilter,
        ],
      },
    });
  });

  it('does not filter by environment for all environments', () => {
    expect(
      getTransactionsProfilingQuery({ ...range, ...filters, environment: ENVIRONMENT_ALL.value })
    ).toEqual({
      bool: {
        filter: [
          ...kqlQuery(filters.kuery),
          { term: { 'service.name': 'my-service' } },
          { term: { 'transaction.name': 'GET /orders' } },
          { term: { 'transaction.type': 'request' } },
          timeRangeFilter,
        ],
      },
    });
  });
});

describe('getHostsProfilingEventsQuery', () => {
  it('filters the profiling events of the containers by the kuery and the time range in seconds', () => {
    expect(
      getHostsProfilingEventsQuery({
        ...range,
        kuery: 'process.thread.name : "main"',
        hostNames: ['host-1'],
        containerIds: ['container-1'],
      })
    ).toEqual({
      bool: {
        filter: [
          ...kqlQuery('(container.id : "container-1") AND process.thread.name : "main"'),
          timeRangeFilter,
        ],
      },
    });
  });

  it('filters the profiling events of the hosts when there are no containers, without APM fields', () => {
    expect(
      getHostsProfilingEventsQuery({ ...range, kuery: '', hostNames: ['host-1'], containerIds: [] })
    ).toEqual({
      bool: { filter: [...kqlQuery('(host.name : "host-1")'), timeRangeFilter] },
    });
  });
});

describe('getProfilingEventsQueryFromKuery', () => {
  it('converts a pre-built kuery and the time range in seconds into a query', () => {
    expect(
      getProfilingEventsQueryFromKuery({
        ...range,
        kuery: '(orchestrator.resource.name : "cart-php")',
      })
    ).toEqual({
      bool: {
        filter: [...kqlQuery('(orchestrator.resource.name : "cart-php")'), timeRangeFilter],
      },
    });
  });

  it('handles an empty kuery without adding a KQL filter', () => {
    expect(getProfilingEventsQueryFromKuery({ ...range, kuery: '' })).toEqual({
      bool: { filter: [...kqlQuery(''), timeRangeFilter] },
    });
  });

  it('combines a scope kuery and a user kuery when they are already merged by the caller', () => {
    const merged =
      '(host.name : "node-a" OR host.name : "node-b") AND (orchestrator.resource.name : "cart") AND process.thread.name : "main"';
    expect(getProfilingEventsQueryFromKuery({ ...range, kuery: merged })).toEqual({
      bool: { filter: [...kqlQuery(merged), timeRangeFilter] },
    });
  });
});
