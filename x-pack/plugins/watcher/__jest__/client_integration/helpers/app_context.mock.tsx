/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { of } from 'rxjs';
import { ComponentType } from 'enzyme';
import { LocationDescriptorObject } from 'history';

import {
  docLinksServiceMock,
  uiSettingsServiceMock,
  notificationServiceMock,
  httpServiceMock,
  scopedHistoryMock,
  executionContextServiceMock,
} from '../../../../../../src/core/public/mocks';
import { AppContextProvider } from '../../../public/application/app_context';
import { AppDeps } from '../../../public/application/app';
import { LicenseStatus } from '../../../common/types/license_status';

class MockTimeBuckets {
  setBounds(_domain: any) {
    return {};
  }
  getInterval() {
    return {
      expression: {},
    };
  }
}

const history = scopedHistoryMock.create();
history.createHref.mockImplementation((location: LocationDescriptorObject) => {
  return `${location.pathname}${location.search ? '?' + location.search : ''}`;
});

export const mockContextValue: AppDeps = {
  licenseStatus$: of<LicenseStatus>({ valid: true }),
  docLinks: docLinksServiceMock.createStartContract(),
  setBreadcrumbs: jest.fn(),
  createTimeBuckets: () => new MockTimeBuckets(),
  uiSettings: uiSettingsServiceMock.createSetupContract(),
  toasts: notificationServiceMock.createSetupContract().toasts,
  theme: {
    useChartsTheme: jest.fn(),
  } as any,
  // For our test harness, we don't use this mocked out http service
  http: httpServiceMock.createSetupContract(),
  history,
  getUrlForApp: jest.fn(),
  executionContext: executionContextServiceMock.createStartContract(),
};

export const withAppContext = (Component: ComponentType<any>) => (props: any) => {
  return (
    <AppContextProvider value={mockContextValue}>
      <Component {...props} />
    </AppContextProvider>
  );
};
