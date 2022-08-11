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
import { SpanFlyout } from '.';

type Args = ComponentProps<typeof SpanFlyout>;

export default {
  title: 'app/TransactionDetails/waterfall/SpanFlyout',
  component: SpanFlyout,
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

export const TransactionSpan: Story<Args> = (args) => {
  return <SpanFlyout {...args} />;
};
TransactionSpan.args = {
  totalDuration: 7589,
  span: {
    parent: {
      id: '969fe48e33f4e13c',
    },
    agent: {
      name: 'ruby',
      version: '4.2.0',
    },
    processor: {
      name: 'transaction',
      event: 'span',
    },
    observer: {
      hostname: 'apm-apm-server-59fb846665-mjb2l',
      id: '1e6ecda2-1347-4800-b5d1-6d9eb3805d1d',
      ephemeral_id: 'd810d578-a7fe-4c7d-8897-b502db141800',
      type: 'apm-server',
      version: '8.0.0',
      version_major: 8,
    },
    trace: {
      id: '1d63e25e7345627176e172ae690f9462',
    },
    '@timestamp': '2021-07-28T02:24:31.803Z',
    service: {
      environment: 'production',
      name: 'opbeans-ruby',
    },
    transaction: {
      id: '969fe48e33f4e13c',
    },
    timestamp: {
      us: 1627439071803773,
    },
    span: {
      duration: {
        us: 5613,
      },
      subtype: 'controller',
      name: 'Api::CustomersController#index',
      action: 'action',
      id: 'dda84b0e3632fbb1',
      type: 'app',
    },
  },
  parentTransaction: {
    container: {
      id: '399a87146c0036592f6ee78553324b10c00757e024143913c97993384751e15e',
    },
    kubernetes: {
      pod: {
        uid: 'dab8ed46-bab6-427c-ba79-6518cc17b60e',
      },
    },
    process: {
      args: ['-C', 'config/puma.rb'],
      pid: 41,
      title: '/usr/local/bundle/bin/puma',
    },
    agent: {
      name: 'ruby',
      version: '4.2.0',
    },
    processor: {
      name: 'transaction',
      event: 'transaction',
    },
    url: {
      domain: '10.43.242.237',
      full: 'http://10.43.242.237:3000/api/customers',
    },
    labels: {
      company: 'opbeans',
    },
    cloud: {
      availability_zone: 'europe-west1-c',
      instance: {
        name: 'gke-edge-oblt-gcp-edge-oblt-gcp-pool-b6b9e929-92m2',
        id: '4295368814211072338',
      },
      provider: 'gcp',
      machine: {
        type: 'projects/8560181848/machineTypes/n1-standard-4',
      },
      project: {
        name: 'elastic-observability',
        id: '8560181848',
      },
      region: 'europe-west1',
    },
    observer: {
      hostname: 'apm-apm-server-59fb846665-k7grs',
      id: 'fcd83d41-d48c-4c84-8aa0-6bb9d4fe374d',
      type: 'apm-server',
      ephemeral_id: 'e325639d-aac5-4b94-a02d-19836ccdc17f',
      version: '8.0.0',
      version_major: 8,
    },
    trace: {
      id: '1d63e25e7345627176e172ae690f9462',
    },
    '@timestamp': '2021-07-28T02:24:31.802Z',
    ecs: {
      version: '1.10.0',
    },
    service: {
      node: {
        name: '399a87146c0036592f6ee78553324b10c00757e024143913c97993384751e15e',
      },
      environment: 'production',
      framework: {
        name: 'Ruby on Rails',
        version: '6.1.4',
      },
      name: 'opbeans-ruby',
      runtime: {
        name: 'ruby',
        version: '2.7.3',
      },
      language: {
        name: 'ruby',
        version: '2.7.3',
      },
      version: '2021-07-27 03:47:02',
    },
    host: {
      os: {
        platform: 'linux',
      },
      ip: '10.40.0.249',
      architecture: 'x86_64',
    },
    http: {
      request: {
        headers: {
          Accept: ['*/*'],
          Version: ['HTTP/1.1'],
          'User-Agent': ['Python/3.7 aiohttp/3.3.2'],
          Host: ['10.43.242.237:3000'],
          'Accept-Encoding': ['gzip, deflate'],
        },
        method: 'GET',
        'body.original': '[SKIPPED]',
        socket: {
          encrypted: false,
        },
        env: {
          ORIGINAL_FULLPATH: '/api/customers',
          GATEWAY_INTERFACE: 'CGI/1.2',
          SERVER_PORT: '3000',
          SERVER_PROTOCOL: 'HTTP/1.1',
          REQUEST_URI: '/api/customers',
          REMOTE_ADDR: '10.40.3.37',
          ORIGINAL_SCRIPT_NAME: '',
          SERVER_SOFTWARE: 'puma 5.3.2 Sweetnighter',
          QUERY_STRING: '',
          ROUTES_9220_SCRIPT_NAME: '',
          SCRIPT_NAME: '',
          REQUEST_METHOD: 'GET',
          REQUEST_PATH: '/api/customers',
          SERVER_NAME: '10.43.242.237',
          PATH_INFO: '/api/customers',
        },
      },
      response: {
        headers: {
          'X-Frame-Options': ['SAMEORIGIN'],
          'Referrer-Policy': ['strict-origin-when-cross-origin'],
          Etag: ['W/"5eb0bc6061d718b6394c1a21d1fbc1fd"'],
          'Cache-Control': ['max-age=0, private, must-revalidate'],
          'X-Request-Id': ['db52f681-e7c2-4f44-b995-e17aa8ba8346'],
          'X-Content-Type-Options': ['nosniff'],
          'X-Runtime': ['0.007023'],
          'X-Xss-Protection': ['1; mode=block'],
          'X-Download-Options': ['noopen'],
          Vary: ['Accept'],
          'X-Permitted-Cross-Domain-Policies': ['none'],
          'Content-Type': ['application/json; charset=utf-8'],
        },
        status_code: 200,
        finished: true,
        headers_sent: true,
      },
      version: '1.1',
    },
    user: {
      id: '3229',
    },
    user_agent: {
      original: 'Python/3.7 aiohttp/3.3.2',
      name: 'Python aiohttp',
      device: {
        name: 'Other',
      },
      version: '3.3.2',
    },
    transaction: {
      duration: {
        us: 7589,
      },
      result: 'HTTP 2xx',
      name: 'Api::CustomersController#index',
      span_count: {
        dropped: 0,
        started: 2,
      },
      id: '969fe48e33f4e13c',
      type: 'request',
      sampled: true,
    },
    timestamp: {
      us: 1627439071802242,
    },
  },
};

export const DatabaseSpan: Story<Args> = (args) => {
  return <SpanFlyout {...args} />;
};
DatabaseSpan.args = {
  totalDuration: 7589,
  span: {
    parent: {
      id: 'dda84b0e3632fbb1',
    },
    agent: {
      name: 'ruby',
      version: '4.2.0',
    },
    processor: {
      name: 'transaction',
      event: 'span',
    },
    observer: {
      hostname: 'apm-apm-server-59fb846665-mjb2l',
      id: '1e6ecda2-1347-4800-b5d1-6d9eb3805d1d',
      type: 'apm-server',
      ephemeral_id: 'd810d578-a7fe-4c7d-8897-b502db141800',
      version: '8.0.0',
      version_major: 8,
    },
    trace: {
      id: '1d63e25e7345627176e172ae690f9462',
    },
    '@timestamp': '2021-07-28T02:24:31.805Z',
    service: {
      environment: 'production',
      name: 'opbeans-ruby',
    },
    transaction: {
      id: '969fe48e33f4e13c',
    },
    span: {
      duration: {
        us: 1234,
      },
      subtype: 'postgresql',
      destination: {
        service: {
          resource: 'postgresql',
        },
      },
      name: 'SELECT FROM customers',
      action: 'sql',
      id: 'da4c078e1bc72004',
      type: 'db',
      db: {
        statement: 'SELECT "customers".* FROM "customers"',
        type: 'sql',
      },
    },
    timestamp: {
      us: 1627439071805402,
    },
  },
};
