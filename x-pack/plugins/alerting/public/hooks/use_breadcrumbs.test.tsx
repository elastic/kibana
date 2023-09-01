/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useBreadcrumbs } from './use_breadcrumbs';
import { MAINTENANCE_WINDOW_DEEP_LINK_IDS } from '../../common';
import { AppMockRenderer, createAppMockRenderer } from '../lib/test_utils';

const mockSetBreadcrumbs = jest.fn();
const mockSetTitle = jest.fn();

jest.mock('../utils/kibana_react', () => {
  const originalModule = jest.requireActual('../utils/kibana_react');
  return {
    ...originalModule,
    useKibana: () => {
      const { services } = originalModule.useKibana();
      return {
        services: {
          ...services,
          chrome: { setBreadcrumbs: mockSetBreadcrumbs, docTitle: { change: mockSetTitle } },
        },
      };
    },
  };
});

jest.mock('./use_navigation', () => {
  const originalModule = jest.requireActual('./use_navigation');
  return {
    ...originalModule,
    useNavigation: jest.fn().mockReturnValue({
      getAppUrl: jest.fn((params?: { deepLinkId: string }) => params?.deepLinkId ?? '/test'),
    }),
  };
});

let appMockRenderer: AppMockRenderer;

describe('useBreadcrumbs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  test('set maintenance windows breadcrumbs', () => {
    renderHook(() => useBreadcrumbs(MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindows), {
      wrapper: appMockRenderer.AppWrapper,
    });
    expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
      { href: '/test', onClick: expect.any(Function), text: 'Stack Management' },
      { text: 'Maintenance Windows' },
    ]);
  });

  test('set create maintenance windows breadcrumbs', () => {
    renderHook(() => useBreadcrumbs(MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindowsCreate), {
      wrapper: appMockRenderer.AppWrapper,
    });
    expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
      { href: '/test', onClick: expect.any(Function), text: 'Stack Management' },
      {
        href: MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindows,
        onClick: expect.any(Function),
        text: 'Maintenance Windows',
      },
      { text: 'Create' },
    ]);
  });

  test('set edit maintenance windows breadcrumbs', () => {
    renderHook(() => useBreadcrumbs(MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindowsEdit), {
      wrapper: appMockRenderer.AppWrapper,
    });
    expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
      { href: '/test', onClick: expect.any(Function), text: 'Stack Management' },
      {
        href: MAINTENANCE_WINDOW_DEEP_LINK_IDS.maintenanceWindows,
        onClick: expect.any(Function),
        text: 'Maintenance Windows',
      },
      { text: 'Edit' },
    ]);
  });
});
