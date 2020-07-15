/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ApmPluginContextValue } from '../../../context/ApmPluginContext';
import { routes } from './route_config';
import { UpdateBreadcrumbs } from './UpdateBreadcrumbs';
import {
  MockApmPluginContextWrapper,
  mockApmPluginContextValue,
} from '../../../context/ApmPluginContext/MockApmPluginContext';

const setBreadcrumbs = jest.fn();

function mountBreadcrumb(route: string, params = '') {
  mount(
    <MockApmPluginContextWrapper
      value={
        ({
          ...mockApmPluginContextValue,
          core: {
            ...mockApmPluginContextValue.core,
            chrome: {
              ...mockApmPluginContextValue.core.chrome,
              setBreadcrumbs,
            },
          },
        } as unknown) as ApmPluginContextValue
      }
    >
      <MemoryRouter initialEntries={[`${route}?kuery=myKuery&${params}`]}>
        <UpdateBreadcrumbs routes={routes} />
      </MemoryRouter>
    </MockApmPluginContextWrapper>
  );
  expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
}

describe('UpdateBreadcrumbs', () => {
  let realDoc: Document;

  beforeEach(() => {
    realDoc = window.document;
    (window.document as any) = {
      title: 'Kibana',
    };
    setBreadcrumbs.mockReset();
  });

  afterEach(() => {
    (window.document as any) = realDoc;
  });

  it('Homepage', () => {
    mountBreadcrumb('/');
    expect(window.document.title).toMatchInlineSnapshot(`"APM"`);
  });

  it('/services/:serviceName/errors/:groupId', () => {
    mountBreadcrumb(
      '/services/opbeans-node/errors/myGroupId',
      'rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0'
    );
    const breadcrumbs = setBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs).toEqual([
      {
        text: 'APM',
        href:
          '#/?kuery=myKuery&rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0',
      },
      {
        text: 'Services',
        href:
          '#/services?kuery=myKuery&rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0',
      },
      {
        text: 'opbeans-node',
        href:
          '#/services/opbeans-node?kuery=myKuery&rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0',
      },
      {
        text: 'Errors',
        href:
          '#/services/opbeans-node/errors?kuery=myKuery&rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0',
      },
      { text: 'myGroupId', href: undefined },
    ]);
    expect(window.document.title).toMatchInlineSnapshot(
      `"myGroupId | Errors | opbeans-node | Services | APM"`
    );
  });

  it('/services/:serviceName/errors', () => {
    mountBreadcrumb('/services/opbeans-node/errors');
    const breadcrumbs = setBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs).toEqual([
      { text: 'APM', href: '#/?kuery=myKuery' },
      { text: 'Services', href: '#/services?kuery=myKuery' },
      { text: 'opbeans-node', href: '#/services/opbeans-node?kuery=myKuery' },
      { text: 'Errors', href: undefined },
    ]);
    expect(window.document.title).toMatchInlineSnapshot(
      `"Errors | opbeans-node | Services | APM"`
    );
  });

  it('/services/:serviceName/transactions', () => {
    mountBreadcrumb('/services/opbeans-node/transactions');
    const breadcrumbs = setBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs).toEqual([
      { text: 'APM', href: '#/?kuery=myKuery' },
      { text: 'Services', href: '#/services?kuery=myKuery' },
      { text: 'opbeans-node', href: '#/services/opbeans-node?kuery=myKuery' },
      { text: 'Transactions', href: undefined },
    ]);
    expect(window.document.title).toMatchInlineSnapshot(
      `"Transactions | opbeans-node | Services | APM"`
    );
  });

  it('/services/:serviceName/transactions/view?transactionName=my-transaction-name', () => {
    mountBreadcrumb(
      '/services/opbeans-node/transactions/view',
      'transactionName=my-transaction-name'
    );
    const breadcrumbs = setBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs).toEqual([
      { text: 'APM', href: '#/?kuery=myKuery' },
      { text: 'Services', href: '#/services?kuery=myKuery' },
      { text: 'opbeans-node', href: '#/services/opbeans-node?kuery=myKuery' },
      {
        text: 'Transactions',
        href: '#/services/opbeans-node/transactions?kuery=myKuery',
      },
      { text: 'my-transaction-name', href: undefined },
    ]);
    expect(window.document.title).toMatchInlineSnapshot(
      `"my-transaction-name | Transactions | opbeans-node | Services | APM"`
    );
  });
});
