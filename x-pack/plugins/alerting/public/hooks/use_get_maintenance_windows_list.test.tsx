/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks/dom';
import { waitFor } from '@testing-library/dom';

import { AppMockRenderer, createAppMockRenderer } from '../lib/test_utils';
import { useGetMaintenanceWindowsList } from './use_get_maintenance_windows_list';

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
jest.mock('../services/maintenance_windows_api/list', () => ({
  getMaintenanceWindowsList: jest.fn(),
}));

const { getMaintenanceWindowsList } = jest.requireMock('../services/maintenance_windows_api/list');

let appMockRenderer: AppMockRenderer;

describe('useCreateMaintenanceWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    appMockRenderer = createAppMockRenderer();
  });

  it('should call onError if api fails', async () => {
    getMaintenanceWindowsList.mockRejectedValue('');

    renderHook(() => useGetMaintenanceWindowsList(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await waitFor(() =>
      expect(mockAddDanger).toBeCalledWith('Unable to load maintenance windows.')
    );
  });
});
