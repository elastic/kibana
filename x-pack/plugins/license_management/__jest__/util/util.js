/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */

import React from 'react';
import { Provider } from 'react-redux';

import { mountWithIntl } from '@kbn/test-jest-helpers';
import { httpServiceMock, scopedHistoryMock } from '../../../../../src/core/public/mocks';
import { licenseManagementStore } from '../../public/application/store/store';
import { AppContextProvider } from '../../public/application/app_context';

const highExpirationMillis = new Date('October 13, 2099 00:00:00Z').getTime();

const history = scopedHistoryMock.create();
history.createHref.mockImplementation((location) => {
  return `${location.pathname}${location.search ? '?' + location.search : ''}`;
});

const appDependencies = {
  docLinks: {},
  services: {
    history,
  },
};

export const createMockLicense = (type, expiryDateInMillis = highExpirationMillis) => {
  return {
    type,
    expiryDateInMillis,
    isActive: new Date().getTime() < expiryDateInMillis,
  };
};

export const getComponent = (initialState, Component) => {
  const services = {
    http: httpServiceMock.createSetupContract(),
    history,
  };
  const store = licenseManagementStore(initialState, services);
  return mountWithIntl(
    <AppContextProvider value={appDependencies}>
      <Provider store={store}>
        <Component />
      </Provider>
    </AppContextProvider>
  );
};
