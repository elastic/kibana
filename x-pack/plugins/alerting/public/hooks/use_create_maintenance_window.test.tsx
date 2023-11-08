/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, renderHook } from '@testing-library/react-hooks/dom';
import { waitFor } from '@testing-library/react';

import { MaintenanceWindow } from '../pages/maintenance_windows/types';
import { AppMockRenderer, createAppMockRenderer } from '../lib/test_utils';
import { useCreateMaintenanceWindow } from './use_create_maintenance_window';

const mockAddDanger = jest.fn();
const mockAddSuccess = jest.fn();

jest.mock('../utils/kibana_react', () => {
  const originalModule = jest.requireActual('../utils/kibana_react');
  return {
    ...originalModule,
    useKibana: () => {
      const { services } = originalModule.useKibana();
      return {
        services: {
          ...services,
          notifications: { toasts: { addSuccess: mockAddSuccess, addDanger: mockAddDanger } },
        },
      };
    },
  };
});
jest.mock('../services/maintenance_windows_api/create', () => ({
  createMaintenanceWindow: jest.fn(),
}));

const { createMaintenanceWindow } = jest.requireMock('../services/maintenance_windows_api/create');

const maintenanceWindow: MaintenanceWindow = {
  title: 'test',
  duration: 1,
  rRule: {
    dtstart: '2023-03-23T19:16:21.293Z',
    tzid: 'America/New_York',
    freq: 3,
    interval: 1,
    byweekday: ['TH'],
  },
};

let appMockRenderer: AppMockRenderer;

describe('useCreateMaintenanceWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    appMockRenderer = createAppMockRenderer();
    createMaintenanceWindow.mockResolvedValue(maintenanceWindow);
  });

  it('should call onSuccess if api succeeds', async () => {
    const { result } = renderHook(() => useCreateMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      await result.current.mutate(maintenanceWindow);
    });
    await waitFor(() => expect(mockAddSuccess).toBeCalledWith("Created maintenance window 'test'"));
  });

  it('should call onError if api fails', async () => {
    createMaintenanceWindow.mockRejectedValue('');

    const { result } = renderHook(() => useCreateMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      await result.current.mutate(maintenanceWindow);
    });

    await waitFor(() =>
      expect(mockAddDanger).toBeCalledWith('Failed to create maintenance window.')
    );
  });
});
