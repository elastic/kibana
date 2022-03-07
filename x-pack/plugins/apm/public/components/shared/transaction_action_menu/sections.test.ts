/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Location } from 'history';
import { IBasePath } from 'kibana/public';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { getSections } from './sections';

describe('Transaction action menu', () => {
  const basePath = {
    prepend: (url: string) => {
      return `some-basepath${url}`;
    },
  } as unknown as IBasePath;
  const date = '2020-02-06T11:00:00.000Z';
  const timestamp = { us: new Date(date).getTime() };

  const urlParams = {
    rangeFrom: 'now-24h',
    rangeTo: 'now',
    refreshPaused: true,
    refreshInterval: 0,
  };

  const location = {
    search:
      '?rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0',
  } as unknown as Location;

  it('shows required sections only', () => {
    const transaction = {
      timestamp,
      trace: { id: '123' },
      transaction: { id: '123' },
      '@timestamp': date,
    } as unknown as Transaction;
    expect(
      getSections({
        transaction,
        basePath,
        location,
        urlParams,
      })
    ).toEqual([
      [
        {
          key: 'traceDetails',
          title: 'Trace details',
          subtitle: 'View trace logs to get further details.',
          actions: [
            {
              key: 'traceLogs',
              label: 'Trace logs',
              href: 'some-basepath/app/logs/link-to/logs?time=1580986800&filter=trace.id:%22123%22%20OR%20%22123%22',
              condition: true,
            },
          ],
        },
      ],
      [
        {
          key: 'kibana',
          actions: [
            {
              key: 'sampleDocument',
              label: 'View transaction in Discover',
              href: 'some-basepath/app/discover#/?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-24h,to:now))&_a=(index:apm_static_index_pattern_id,interval:auto,query:(language:kuery,query:\'processor.event:"transaction" AND transaction.id:"123" AND trace.id:"123"\'))',
              condition: true,
            },
          ],
        },
      ],
    ]);
  });

  it('shows pod and required sections only', () => {
    const transaction = {
      kubernetes: { pod: { uid: '123' } },
      timestamp,
      trace: { id: '123' },
      transaction: { id: '123' },
      '@timestamp': date,
    } as unknown as Transaction;
    expect(
      getSections({
        transaction,
        basePath,
        location,
        urlParams,
      })
    ).toEqual([
      [
        {
          key: 'podDetails',
          title: 'Pod details',
          subtitle:
            'View logs and metrics for this pod to get further details.',
          actions: [
            {
              key: 'podLogs',
              label: 'Pod logs',
              href: 'some-basepath/app/logs/link-to/pod-logs/123?time=1580986800',
              condition: true,
            },
            {
              key: 'podMetrics',
              label: 'Pod metrics',
              href: 'some-basepath/app/metrics/link-to/pod-detail/123?from=1580986500000&to=1580987100000',
              condition: true,
            },
          ],
        },
        {
          key: 'traceDetails',
          title: 'Trace details',
          subtitle: 'View trace logs to get further details.',
          actions: [
            {
              key: 'traceLogs',
              label: 'Trace logs',
              href: 'some-basepath/app/logs/link-to/logs?time=1580986800&filter=trace.id:%22123%22%20OR%20%22123%22',
              condition: true,
            },
          ],
        },
      ],
      [
        {
          key: 'kibana',
          actions: [
            {
              key: 'sampleDocument',
              label: 'View transaction in Discover',
              href: 'some-basepath/app/discover#/?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-24h,to:now))&_a=(index:apm_static_index_pattern_id,interval:auto,query:(language:kuery,query:\'processor.event:"transaction" AND transaction.id:"123" AND trace.id:"123"\'))',
              condition: true,
            },
          ],
        },
      ],
    ]);
  });

  it('shows host and required sections only', () => {
    const transaction = {
      host: { hostname: 'foo' },
      timestamp,
      trace: { id: '123' },
      transaction: { id: '123' },
      '@timestamp': date,
    } as unknown as Transaction;
    expect(
      getSections({
        transaction,
        basePath,
        location,
        urlParams,
      })
    ).toEqual([
      [
        {
          key: 'hostDetails',
          title: 'Host details',
          subtitle: 'View host logs and metrics to get further details.',
          actions: [
            {
              key: 'hostLogs',
              label: 'Host logs',
              href: 'some-basepath/app/logs/link-to/host-logs/foo?time=1580986800',
              condition: true,
            },
            {
              key: 'hostMetrics',
              label: 'Host metrics',
              href: 'some-basepath/app/metrics/link-to/host-detail/foo?from=1580986500000&to=1580987100000',
              condition: true,
            },
          ],
        },
        {
          key: 'traceDetails',
          title: 'Trace details',
          subtitle: 'View trace logs to get further details.',
          actions: [
            {
              key: 'traceLogs',
              label: 'Trace logs',
              href: 'some-basepath/app/logs/link-to/logs?time=1580986800&filter=trace.id:%22123%22%20OR%20%22123%22',
              condition: true,
            },
          ],
        },
      ],
      [
        {
          key: 'kibana',
          actions: [
            {
              key: 'sampleDocument',
              label: 'View transaction in Discover',
              href: 'some-basepath/app/discover#/?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-24h,to:now))&_a=(index:apm_static_index_pattern_id,interval:auto,query:(language:kuery,query:\'processor.event:"transaction" AND transaction.id:"123" AND trace.id:"123"\'))',
              condition: true,
            },
          ],
        },
      ],
    ]);
  });
});
