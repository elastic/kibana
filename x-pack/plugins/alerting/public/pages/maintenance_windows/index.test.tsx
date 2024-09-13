/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import type { Capabilities } from '@kbn/core-capabilities-common';
import { AppMockRenderer, createAppMockRenderer } from '../../lib/test_utils';
import { useFindMaintenanceWindows } from '../../hooks/use_find_maintenance_windows';
import { MaintenanceWindowsPage } from '.';
import { MAINTENANCE_WINDOW_FEATURE_ID } from '../../../common';

jest.mock('../../hooks/use_find_maintenance_windows', () => ({
  useFindMaintenanceWindows: jest.fn(),
}));

describe('Maintenance windows page', () => {
  let appMockRenderer: AppMockRenderer;
  let license = licensingMock.createLicense({
    license: { type: 'platinum' },
  });
  let capabilities: Capabilities = {
    [MAINTENANCE_WINDOW_FEATURE_ID]: {
      show: true,
      save: true,
    },
    navLinks: {},
    management: {},
    catalogue: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useFindMaintenanceWindows as jest.Mock).mockReturnValue({
      isLoading: false,
      maintenanceWindows: [],
      refetch: jest.fn(),
    });
    license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });
    capabilities = {
      maintenanceWindow: {
        show: true,
        save: true,
      },
      navLinks: {},
      management: {},
      catalogue: {},
    };
    appMockRenderer = createAppMockRenderer({ capabilities, license });
  });

  test('show license prompt', () => {
    license = licensingMock.createLicense({
      license: { type: 'gold' },
    });
    appMockRenderer = createAppMockRenderer({ capabilities, license });
    const result = appMockRenderer.render(<MaintenanceWindowsPage />);
    expect(result.queryByTestId('mw-license-prompt')).toBeInTheDocument();
  });

  test('show empty prompt', () => {
    const result = appMockRenderer.render(<MaintenanceWindowsPage />);
    expect(result.queryByTestId('mw-empty-prompt')).toBeInTheDocument();
    expect(appMockRenderer.mocked.setBadge).not.toBeCalled();
  });

  test('show table in read only', () => {
    capabilities = {
      ...capabilities,
      [MAINTENANCE_WINDOW_FEATURE_ID]: {
        show: true,
        save: false,
      },
    };
    appMockRenderer = createAppMockRenderer({ capabilities, license });
    const result = appMockRenderer.render(<MaintenanceWindowsPage />);
    expect(result.queryByTestId('maintenance-windows-table')).toBeInTheDocument();
    expect(appMockRenderer.mocked.setBadge).toBeCalledTimes(1);
  });
});
