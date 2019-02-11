/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { MemoryRouter } from 'react-router-dom';
import { UpdateBreadcrumbs } from '../UpdateBreadcrumbs';
import chrome from 'ui/chrome';

jest.mock(
  'ui/chrome',
  () => ({
    breadcrumbs: {
      set: jest.fn()
    },
    getBasePath: () => `/some/base/path`,
    getUiSettingsClient: () => {
      return {
        get: key => {
          switch (key) {
            case 'timepicker:timeDefaults':
              return { from: 'now-15m', to: 'now', mode: 'quick' };
            case 'timepicker:refreshIntervalDefaults':
              return { display: 'Off', pause: false, value: 0 };
            default:
              throw new Error(`Unexpected config key: ${key}`);
          }
        }
      };
    }
  }),
  { virtual: true }
);

function expectBreadcrumbToMatchSnapshot(route) {
  mount(
    <MemoryRouter initialEntries={[`${route}?_g=myG&kuery=myKuery`]}>
      <UpdateBreadcrumbs />
    </MemoryRouter>
  );
  expect(chrome.breadcrumbs.set).toHaveBeenCalledTimes(1);
  expect(chrome.breadcrumbs.set.mock.calls[0][0]).toMatchSnapshot();
}

describe('Breadcrumbs', () => {
  beforeEach(() => {
    chrome.breadcrumbs.set.mockReset();
  });

  it('Homepage', () => {
    expectBreadcrumbToMatchSnapshot('/');
  });

  it('/:serviceName/errors/:groupId', () => {
    expectBreadcrumbToMatchSnapshot('/opbeans-node/errors/myGroupId');
  });

  it('/:serviceName/errors', () => {
    expectBreadcrumbToMatchSnapshot('/opbeans-node/errors');
  });

  it('/:serviceName', () => {
    expectBreadcrumbToMatchSnapshot('/opbeans-node');
  });

  it('/:serviceName/transactions', () => {
    expectBreadcrumbToMatchSnapshot('/opbeans-node/transactions');
  });

  it('/:serviceName/transactions/:transactionType', () => {
    expectBreadcrumbToMatchSnapshot('/opbeans-node/transactions/request');
  });

  it('/:serviceName/transactions/:transactionType/:transactionName', () => {
    expectBreadcrumbToMatchSnapshot(
      '/:serviceName/transactions/request/my-transaction-name'
    );
  });
});
