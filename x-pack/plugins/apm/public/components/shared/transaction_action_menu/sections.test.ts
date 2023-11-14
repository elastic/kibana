/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMemoryHistory } from 'history';
import { IBasePath } from '@kbn/core/public';
import { LocatorPublic } from '@kbn/share-plugin/common';
import {
  LogsLocatorParams,
  NodeLogsLocatorParams,
} from '@kbn/logs-shared-plugin/common';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { getSections } from './sections';
import {
  apmRouter as apmRouterBase,
  ApmRouter,
} from '../../routing/apm_route_config';
import {
  infraLocatorsMock,
  observabilityLogExplorerLocatorsMock,
} from '../../../context/apm_plugin/mock_apm_plugin_context';

const apmRouter = {
  ...apmRouterBase,
  link: (...args: [any]) =>
    `some-basepath/app/apm${apmRouterBase.link(...args)}`,
} as ApmRouter;

const { allDatasetsLocator } = observabilityLogExplorerLocatorsMock;
const { nodeLogsLocator, logsLocator } = infraLocatorsMock;

const expectInfraLocatorsToBeCalled = () => {
  expect(nodeLogsLocator.getRedirectUrl).toBeCalledTimes(3);
  expect(logsLocator.getRedirectUrl).toBeCalledTimes(1);
};

describe('Transaction action menu', () => {
  const basePath = {
    prepend: (url: string) => {
      return `some-basepath${url}`;
    },
  } as unknown as IBasePath;
  const date = '2020-02-06T11:00:00.000Z';
  const timestamp = { us: new Date(date).getTime() };

  const history = createMemoryHistory();
  history.replace(
    '/services/testbeans-go/transactions/view?rangeFrom=now-24h&rangeTo=now&transactionName=GET+%2Ftestbeans-go%2Fapi'
  );
  const location = history.location;

  afterEach(() => {
    jest.clearAllMocks();
  });

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
        apmRouter,
        allDatasetsLocator,
        logsLocator: logsLocator as unknown as LocatorPublic<LogsLocatorParams>,
        nodeLogsLocator:
          nodeLogsLocator as unknown as LocatorPublic<NodeLogsLocatorParams>,
        infraLinksAvailable: false,
        rangeFrom: 'now-24h',
        rangeTo: 'now',
        environment: 'ENVIRONMENT_ALL',
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
              condition: true,
            },
          ],
        },
        {
          key: 'serviceMap',
          title: 'Service Map',
          subtitle: 'View service map filtered by this trace.',
          actions: [
            {
              key: 'serviceMap',
              label: 'Show in service map',
              href: 'some-basepath/app/apm/service-map?comparisonEnabled=false&environment=ENVIRONMENT_ALL&kuery=trace.id%20%3A%20%22123%22&rangeFrom=now-24h&rangeTo=now&serviceGroup=',
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
    expectInfraLocatorsToBeCalled();
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
        apmRouter,
        logsLocator: logsLocator as unknown as LocatorPublic<LogsLocatorParams>,
        nodeLogsLocator:
          nodeLogsLocator as unknown as LocatorPublic<NodeLogsLocatorParams>,
        allDatasetsLocator,
        infraLinksAvailable: true,
        rangeFrom: 'now-24h',
        rangeTo: 'now',
        environment: 'ENVIRONMENT_ALL',
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
              condition: true,
            },
          ],
        },
        {
          key: 'serviceMap',
          title: 'Service Map',
          subtitle: 'View service map filtered by this trace.',
          actions: [
            {
              key: 'serviceMap',
              label: 'Show in service map',
              href: 'some-basepath/app/apm/service-map?comparisonEnabled=false&environment=ENVIRONMENT_ALL&kuery=trace.id%20%3A%20%22123%22&rangeFrom=now-24h&rangeTo=now&serviceGroup=',
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
    expectInfraLocatorsToBeCalled();
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
        apmRouter,
        logsLocator: logsLocator as unknown as LocatorPublic<LogsLocatorParams>,
        nodeLogsLocator:
          nodeLogsLocator as unknown as LocatorPublic<NodeLogsLocatorParams>,
        allDatasetsLocator,
        infraLinksAvailable: true,
        rangeFrom: 'now-24h',
        rangeTo: 'now',
        environment: 'ENVIRONMENT_ALL',
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
              condition: true,
            },
          ],
        },
        {
          key: 'serviceMap',
          title: 'Service Map',
          subtitle: 'View service map filtered by this trace.',
          actions: [
            {
              key: 'serviceMap',
              label: 'Show in service map',
              href: 'some-basepath/app/apm/service-map?comparisonEnabled=false&environment=ENVIRONMENT_ALL&kuery=trace.id%20%3A%20%22123%22&rangeFrom=now-24h&rangeTo=now&serviceGroup=',
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
    expectInfraLocatorsToBeCalled();
  });
});
