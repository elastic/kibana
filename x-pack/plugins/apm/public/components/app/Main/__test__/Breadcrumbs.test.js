/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { MemoryRouter } from 'react-router-dom';

import Breadcrumbs from '../Breadcrumbs';
import { toJson } from '../../../../utils/testHelpers';

jest.mock(
  'ui/chrome',
  () => ({
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
  const wrapper = mount(
    <MemoryRouter initialEntries={[`${route}?_g=myG&kuery=myKuery`]}>
      <Breadcrumbs showPluginBreadcrumbs={true} />
    </MemoryRouter>
  );
  expect(
    toJson(wrapper.find('.kuiLocalBreadcrumb').children())
  ).toMatchSnapshot();
}

describe('Breadcrumbs', () => {
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

  it('does not render breadcrumbs when showPluginBreadcrumbs = false', () => {
    const wrapper = mount(
      <MemoryRouter initialEntries={[`/?_g=myG&kuery=myKuery`]}>
        <Breadcrumbs showPluginBreadcrumbs={false} />
      </MemoryRouter>
    );
    expect(wrapper.find('.kuiLocalBreadcrumbs').exists()).toEqual(false);
  });
});
