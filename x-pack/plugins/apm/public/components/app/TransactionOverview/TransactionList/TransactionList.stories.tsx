/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { MockApmPluginContextWrapper } from '../../../../context/ApmPluginContext/MockApmPluginContext';
import { TransactionList } from './';

type TransactionGroup = APIReturnType<
  'GET /api/apm/services/{serviceName}/transaction_groups'
>['items'][0];

export default {
  title: 'app/TransactionOverview/TransactionList',
  component: TransactionList,
  decorators: [
    (Story: ComponentType) => (
      <MockApmPluginContextWrapper>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </MockApmPluginContextWrapper>
    ),
  ],
};

export function SingleRow() {
  const items: TransactionGroup[] = [
    {
      key: {
        ['service.name']: 'adminconsole',
        ['transaction.name']:
          'GET /api/v1/regions/azure-eastus2/clusters/elasticsearch/xc18de071deb4262be54baebf5f6a1ce/proxy/_snapshot/found-snapshots/_all',
      },
      transactionName:
        'GET /api/v1/regions/azure-eastus2/clusters/elasticsearch/xc18de071deb4262be54baebf5f6a1ce/proxy/_snapshot/found-snapshots/_all',
      serviceName: 'adminconsole',
      transactionType: 'request',
      p95: 11974156,
      averageResponseTime: 8087434.558974359,
      transactionsPerMinute: 0.40625,
      impact: 100,
    },
  ];

  return <TransactionList isLoading={false} items={items} />;
}
