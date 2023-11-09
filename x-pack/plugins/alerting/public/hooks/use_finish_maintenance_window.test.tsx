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
import { useFinishMaintenanceWindow } from './use_finish_maintenance_window';

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
jest.mock('../services/maintenance_windows_api/finish', () => ({
  finishMaintenanceWindow: jest.fn(),
}));

const { finishMaintenanceWindow } = jest.requireMock('../services/maintenance_windows_api/finish');

const maintenanceWindow: MaintenanceWindow = {
  title: 'cancel',
  duration: 1,
  rRule: {
    dtstart: '2023-03-23T19:16:21.293Z',
    tzid: 'America/New_York',
  },
};

let appMockRenderer: AppMockRenderer;

describe('useFinishMaintenanceWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    appMockRenderer = createAppMockRenderer();
    finishMaintenanceWindow.mockResolvedValue(maintenanceWindow);
  });

  it('should call onSuccess if api succeeds', async () => {
    const { result } = renderHook(() => useFinishMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      await result.current.mutate('123');
    });
    await waitFor(() =>
      expect(mockAddSuccess).toBeCalledWith("Cancelled running maintenance window 'cancel'")
    );
  });

  it('should call onError if api fails', async () => {
    finishMaintenanceWindow.mockRejectedValue('');

    const { result } = renderHook(() => useFinishMaintenanceWindow(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await act(async () => {
      await result.current.mutate('123');
    });

    await waitFor(() =>
      expect(mockAddDanger).toBeCalledWith('Failed to cancel maintenance window.')
    );
  });
});
