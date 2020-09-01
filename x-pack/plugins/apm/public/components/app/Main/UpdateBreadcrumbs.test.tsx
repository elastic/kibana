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
const changeTitle = jest.fn();

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
              docTitle: { change: changeTitle },
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
  beforeEach(() => {
    setBreadcrumbs.mockReset();
    changeTitle.mockReset();
  });

  it('Changes the homepage title', () => {
    mountBreadcrumb('/');
    expect(changeTitle).toHaveBeenCalledWith(['APM']);
  });

  it('/services/:serviceName/errors/:groupId', () => {
    mountBreadcrumb(
      '/services/opbeans-node/errors/myGroupId',
      'rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0'
    );
    const breadcrumbs = setBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: 'APM',
          href:
            '/basepath/app/apm/?kuery=myKuery&rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0',
        }),
        expect.objectContaining({
          text: 'Services',
          href:
            '/basepath/app/apm/services?kuery=myKuery&rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0',
        }),
        expect.objectContaining({
          text: 'opbeans-node',
          href:
            '/basepath/app/apm/services/opbeans-node?kuery=myKuery&rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0',
        }),
        expect.objectContaining({
          text: 'Errors',
          href:
            '/basepath/app/apm/services/opbeans-node/errors?kuery=myKuery&rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0',
        }),
        expect.objectContaining({ text: 'myGroupId', href: undefined }),
      ])
    );

    expect(changeTitle).toHaveBeenCalledWith([
      'myGroupId',
      'Errors',
      'opbeans-node',
      'Services',
      'APM',
    ]);
  });

  it('/services/:serviceName/errors', () => {
    mountBreadcrumb('/services/opbeans-node/errors');
    const breadcrumbs = setBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: 'APM',
          href: '/basepath/app/apm/?kuery=myKuery',
        }),
        expect.objectContaining({
          text: 'Services',
          href: '/basepath/app/apm/services?kuery=myKuery',
        }),
        expect.objectContaining({
          text: 'opbeans-node',
          href: '/basepath/app/apm/services/opbeans-node?kuery=myKuery',
        }),
        expect.objectContaining({ text: 'Errors', href: undefined }),
      ])
    );
    expect(changeTitle).toHaveBeenCalledWith([
      'Errors',
      'opbeans-node',
      'Services',
      'APM',
    ]);
  });

  it('/services/:serviceName/transactions', () => {
    mountBreadcrumb('/services/opbeans-node/transactions');
    const breadcrumbs = setBreadcrumbs.mock.calls[0][0];
    expect(breadcrumbs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: 'APM',
          href: '/basepath/app/apm/?kuery=myKuery',
        }),
        expect.objectContaining({
          text: 'Services',
          href: '/basepath/app/apm/services?kuery=myKuery',
        }),
        expect.objectContaining({
          text: 'opbeans-node',
          href: '/basepath/app/apm/services/opbeans-node?kuery=myKuery',
        }),
        expect.objectContaining({ text: 'Transactions', href: undefined }),
      ])
    );

    expect(changeTitle).toHaveBeenCalledWith([
      'Transactions',
      'opbeans-node',
      'Services',
      'APM',
    ]);
  });

  it('/services/:serviceName/transactions/view?transactionName=my-transaction-name', () => {
    mountBreadcrumb(
      '/services/opbeans-node/transactions/view',
      'transactionName=my-transaction-name'
    );
    const breadcrumbs = setBreadcrumbs.mock.calls[0][0];

    expect(breadcrumbs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: 'APM',
          href: '/basepath/app/apm/?kuery=myKuery',
        }),
        expect.objectContaining({
          text: 'Services',
          href: '/basepath/app/apm/services?kuery=myKuery',
        }),
        expect.objectContaining({
          text: 'opbeans-node',
          href: '/basepath/app/apm/services/opbeans-node?kuery=myKuery',
        }),
        expect.objectContaining({
          text: 'Transactions',
          href:
            '/basepath/app/apm/services/opbeans-node/transactions?kuery=myKuery',
        }),
        expect.objectContaining({
          text: 'my-transaction-name',
          href: undefined,
        }),
      ])
    );

    expect(changeTitle).toHaveBeenCalledWith([
      'my-transaction-name',
      'Transactions',
      'opbeans-node',
      'Services',
      'APM',
    ]);
  });
});
