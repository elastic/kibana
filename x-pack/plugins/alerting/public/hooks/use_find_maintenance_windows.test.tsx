/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks/dom';
import { waitFor } from '@testing-library/react';

import { AppMockRenderer, createAppMockRenderer } from '../lib/test_utils';
import { useFindMaintenanceWindows } from './use_find_maintenance_windows';

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
jest.mock('../services/maintenance_windows_api/find', () => ({
  findMaintenanceWindows: jest.fn(),
}));

const { findMaintenanceWindows } = jest.requireMock('../services/maintenance_windows_api/find');

let appMockRenderer: AppMockRenderer;

describe('useFindMaintenanceWindows', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    appMockRenderer = createAppMockRenderer();
  });

  it('should call onError if api fails', async () => {
    findMaintenanceWindows.mockRejectedValue('This is an error.');

    renderHook(() => useFindMaintenanceWindows(), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await waitFor(() =>
      expect(mockAddDanger).toBeCalledWith('Unable to load maintenance windows.')
    );
  });

  it('should not try to find maintenance windows if not enabled', async () => {
    renderHook(() => useFindMaintenanceWindows({ enabled: false }), {
      wrapper: appMockRenderer.AppWrapper,
    });

    await waitFor(() => expect(findMaintenanceWindows).toHaveBeenCalledTimes(0));
  });
});
