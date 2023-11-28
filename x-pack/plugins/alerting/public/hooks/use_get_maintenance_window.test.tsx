/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks/dom';
import { waitFor } from '@testing-library/react';

import { AppMockRenderer, createAppMockRenderer } from '../lib/test_utils';
import { useGetMaintenanceWindow } from './use_get_maintenance_window';

const mockAddDanger = jest.fn();

jest.mock('../utils/kibana_react', () => {
  const originalModule = jest.requireActual('../utils/kibana_react');
  return {
    ...originalModule,
    useKibana: () => {
      const { services } = originalModule.useKibana();
      return {
        services: {
          ...services,
          notifications: { toasts: { addDanger: mockAddDanger } },
        },
      };
    },
  };
});
jest.mock('../services/maintenance_windows_api/get', () => ({
  getMaintenanceWindow: jest.fn(),
}));

const { getMaintenanceWindow } = jest.requireMock('../services/maintenance_windows_api/get');

let appMockRenderer: AppMockRenderer;

describe('useGetMaintenanceWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    appMockRenderer = createAppMockRenderer();
  });

  it('should call onError if api fails', async () => {
    getMaintenanceWindow.mockRejectedValue('');

    renderHook(() => useGetMaintenanceWindow('testId'), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await waitFor(() => expect(mockAddDanger).toBeCalledWith('Unable to get maintenance window.'));
  });
});
