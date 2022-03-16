/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Story } from '@storybook/react';
import React, { ComponentProps, ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MockApmPluginContextWrapper } from '../../../../../../../context/apm_plugin/mock_apm_plugin_context';
import { TransactionFlyout } from './';

type Args = ComponentProps<typeof TransactionFlyout>;

export default {
  title: 'app/TransactionDetails/waterfall/TransactionFlyout',
  component: TransactionFlyout,
  decorators: [
    (StoryComponent: ComponentType) => {
      return (
        <MemoryRouter
          initialEntries={[
            '/services/testServiceName/transactions/view?rangeFrom=now-15m&rangeTo=now&transactionName=Api::CustomersController%23index&transactionType=request&latencyAggregationType=avg&flyoutDetailTab=&waterfallItemId=0863ecffc80f0aed&traceId=1d63e25e7345627176e172ae690f9462&transactionId=969fe48e33f4e13c',
          ]}
        >
          <MockApmPluginContextWrapper>
            <StoryComponent />
          </MockApmPluginContextWrapper>
        </MemoryRouter>
      );
    },
  ],
};

export const Example: Story<Args> = (args) => {
  return <TransactionFlyout {...args} />;
};
Example.args = {
  transaction: {
    container: {
      id: '4810e1f4da909044f1f6f56be41a542dc59784948f059769d6a590952deca405',
    },
    kubernetes: {
      pod: {
        uid: 'c44f58b9-d1fa-4341-a40a-4fdcac0ec4d0',
        name: 'opbeans-java-6995b65cc9-gtwzd',
      },
    },
    agent: {
      name: 'java',
      ephemeral_id: '12f7e44a-8b1d-467b-afe0-46b9a1c60535',
      version: '1.25.1-SNAPSHOT.UNKNOWN',
    },
    process: {
      pid: 8,
      title: '/opt/java/openjdk/bin/java',
      ppid: 1,
    },
    processor: {
      name: 'transaction',
      event: 'transaction',
    },
    url: {
      domain: '10.43.242.237',
      full: 'http://10.43.242.237:3000/api/orders',
    },
    cloud: {
      availability_zone: 'europe-west1-c',
      instance: {
        name: 'gke-edge-oblt-gcp-edge-oblt-gcp-pool-b6b9e929-92m2',
        id: '4295368814211072338',
      },
      provider: 'gcp',
      machine: {
        type: 'n1-standard-4',
      },
      project: {
        name: 'elastic-observability',
        id: '8560181848',
      },
      region: 'europe-west1',
    },
    observer: {
      hostname: 'apm-apm-server-57659d6b4c-zvspw',
      id: 'ab52d330-8ad1-4eb2-b692-92b8fa2ddcce',
      type: 'apm-server',
      ephemeral_id: 'aeb9add4-1ee1-4194-bbea-989de999c44a',
      version: '8.0.0',
      version_major: 8,
    },
    trace: {
      id: 'b80358b455b1075670cbc5fe57aa6d64',
    },
    '@timestamp': '2021-07-28T17:34:04.335Z',
    ecs: {
      version: '1.10.0',
    },
    service: {
      node: {
        name: '4810e1f4da909044f1f6f56be41a542dc59784948f059769d6a590952deca405',
      },
      environment: 'production',
      framework: {
        name: 'Servlet API',
      },
      name: 'opbeans-java',
      runtime: {
        name: 'Java',
        version: '11.0.11',
      },
      language: {
        name: 'Java',
        version: '11.0.11',
      },
      version: '2021-07-28 03:47:59',
    },
    host: {
      os: {
        platform: 'Linux',
      },
      ip: '10.40.0.104',
      architecture: 'amd64',
    },
    http: {
      request: {
        headers: {
          Accept: ['*/*'],
          'User-Agent': ['Python/3.7 aiohttp/3.3.2'],
          Host: ['10.43.242.237:3000'],
          'Accept-Encoding': ['gzip, deflate'],
        },
        method: 'GET',
        socket: {
          encrypted: false,
          remote_address: '10.40.2.215',
        },
      },
      response: {
        headers: {
          'Transfer-Encoding': ['chunked'],
          Date: ['Wed, 28 Jul 2021 17:34:04 GMT'],
          'Content-Type': ['application/json;charset=ISO-8859-1'],
        },
        status_code: 200,
        finished: true,
        headers_sent: true,
      },
      version: '1.1',
    },
    transaction: {
      duration: {
        us: 23961,
      },
      result: 'HTTP 2xx',
      name: 'DispatcherServlet#doGet',
      id: 'ade1f180d840845c',
      span_count: {
        dropped: 0,
        started: 1,
      },
      type: 'request',
      sampled: true,
    },
    user_agent: {
      original: 'Python/3.7 aiohttp/3.3.2',
      name: 'Python aiohttp',
      device: {
        name: 'Other',
      },
      version: '3.3.2',
    },
    timestamp: {
      us: 1627493644335001,
    },
  },
  rootTransactionDuration: 23961,
};
