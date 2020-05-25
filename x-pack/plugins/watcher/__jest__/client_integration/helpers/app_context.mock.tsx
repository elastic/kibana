/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { of } from 'rxjs';
import { ComponentType } from 'enzyme';
import { LocationDescriptorObject } from 'history';
import { ScopedHistory } from 'src/core/public';
import {
  docLinksServiceMock,
  uiSettingsServiceMock,
  notificationServiceMock,
  httpServiceMock,
  scopedHistoryMock,
} from '../../../../../../src/core/public/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AppContextProvider } from '../../../public/application/app_context';
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

const history = (scopedHistoryMock.create() as unknown) as ScopedHistory;
history.createHref = (location: LocationDescriptorObject) => {
  return `${location.pathname}${location.search ? '?' + location.search : ''}`;
};

export const mockContextValue = {
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
};

export const withAppContext = (Component: ComponentType<any>) => (props: any) => {
  return (
    <AppContextProvider value={mockContextValue}>
      <Component {...props} />
    </AppContextProvider>
  );
};
