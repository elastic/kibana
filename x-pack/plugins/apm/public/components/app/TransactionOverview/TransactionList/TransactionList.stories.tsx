/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TransactionGroup } from '../../../../../server/lib/transaction_groups/fetcher';
import { TransactionList } from './';

storiesOf('app/TransactionOverview/TransactionList', module).add(
  'Single Row',
  () => {
    const items: TransactionGroup[] = [
      {
        name:
          'GET /api/v1/regions/azure-eastus2/clusters/elasticsearch/xc18de071deb4262be54baebf5f6a1ce/proxy/_snapshot/found-snapshots/_all',
        sample: {
          container: {
            id:
              'xa802046074071c9c828e8db3b7ef92ea0484d9fe783b9c518f65a7b45dfdd2c',
          },
          agent: {
            name: 'java',
            ephemeral_id: 'x787d6b7-3241-4b55-ba49-0c96bc9857d1',
            version: '1.17.0',
          },
          process: {
            pid: 28,
            title: '/usr/lib/jvm/java-8-openjdk-amd64/jre/bin/java',
          },
          processor: {
            name: 'transaction',
            event: 'transaction',
          },
          labels: {
            path:
              '/api/v1/regions/azure-eastus2/clusters/elasticsearch/xc18de071deb4262be54baebf5f6a1ce/proxy/_snapshot/found-snapshots/_all',
            status_code: '200',
            request_method: 'GET',
            request_id: 'x273dc2477e021979125e0ec67e8d778',
          },
          observer: {
            hostname: 'x840922c967b',
            name: 'instance-000000000x',
            id: 'xb384baf-c16a-415a-928a-a10635a04b81',
            ephemeral_id: 'x9227f0e-848d-423e-a65a-5fdee321f4a9',
            type: 'apm-server',
            version: '7.8.1',
            version_major: 7,
          },
          trace: {
            id: 'x998d7e5db84aa8341b358a264a78984',
          },
          '@timestamp': '2020-08-26T14:40:31.472Z',
          ecs: {
            version: '1.5.0',
          },
          service: {
            node: {
              name:
                'xa802046074071c9c828e8db3b7ef92ea0484d9fe783b9c518f65a7b45dfdd2c',
            },
            environment: 'qa',
            framework: {
              name: 'API',
            },
            name: 'adminconsole',
            runtime: {
              name: 'Java',
              version: '1.8.0_265',
            },
            language: {
              name: 'Java',
              version: '1.8.0_265',
            },
            version: 'ms-44.1-BC_1',
          },
          host: {
            hostname: 'xa8020460740',
            os: {
              platform: 'Linux',
            },
            ip: '3.83.239.24',
            name: 'xa8020460740',
            architecture: 'amd64',
          },
          transaction: {
            duration: {
              us: 8260617,
            },
            result: 'HTTP 2xx',
            name:
              'GET /api/v1/regions/azure-eastus2/clusters/elasticsearch/xc18de071deb4262be54baebf5f6a1ce/proxy/_snapshot/found-snapshots/_all',
            span_count: {
              dropped: 0,
              started: 8,
            },
            id: 'xaa3cae6fd4f7023',
            type: 'request',
            sampled: true,
          },
          timestamp: {
            us: 1598452831472001,
          },
        },
        p95: 11974156,
        averageResponseTime: 8087434.558974359,
        transactionsPerMinute: 0.40625,
        impact: 100,
        impactRelative: 100,
      },
    ];

    return <TransactionList isLoading={false} items={items} />;
  }
);
