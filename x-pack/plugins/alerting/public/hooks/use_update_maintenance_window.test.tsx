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
import { useUpdateMaintenanceWindow } from './use_update_maintenance_window';

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
jest.mock('../services/maintenance_windows_api/update', () => ({
  updateMaintenanceWindow: jest.fn(),
}));

const { updateMaintenanceWindow } = jest.requireMock('../services/maintenance_windows_api/update');

const maintenanceWindow: MaintenanceWindow = {
  title: 'updated',
  duration: 1,
  rRule: {
    dtstart: '2023-03-23T19:16:21.293Z',
    tzid: 'America/New_York',
  },
};

let appMockRenderer: AppMockRenderer;

describe('useUpdateMaintenanceWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    appMockRenderer = createAppMockRenderer();
    updateMaintenanceWindow.mockResolvedValue(maintenanceWindow);
  });

  it('should call onSuccess if api succeeds', async () => {
    const { result } = renderHook(() => useUpdateMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      await result.current.mutate({ maintenanceWindowId: '123', maintenanceWindow });
    });
    await waitFor(() =>
      expect(mockAddSuccess).toBeCalledWith("Updated maintenance window 'updated'")
    );
  });

  it('should call onError if api fails', async () => {
    updateMaintenanceWindow.mockRejectedValue('');

    const { result } = renderHook(() => useUpdateMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      await result.current.mutate({ maintenanceWindowId: '123', maintenanceWindow });
    });

    await waitFor(() =>
      expect(mockAddDanger).toBeCalledWith('Failed to update maintenance window.')
    );
  });
});
