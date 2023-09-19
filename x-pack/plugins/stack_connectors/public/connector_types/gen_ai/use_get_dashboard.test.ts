/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useGetDashboard } from './use_get_dashboard';
import { getDashboard } from './api';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';

jest.mock('./api');
const mockToasts = { addDanger: jest.fn() };
const mockSpace = {
  id: 'space',
  name: 'space',
  disabledFeatures: [],
};
const mockHttp = jest.fn();
const mockGetRedirectUrl = jest.fn();
jest.mock('@kbn/triggers-actions-ui-plugin/public');
const connectorId = '123';

const mockServices = {
  http: mockHttp,
  notifications: { toasts: mockToasts },
  dashboard: {
    locator: {
      getRedirectUrl: mockGetRedirectUrl.mockImplementation(
        ({ dashboardId }) => `http://localhost:5601/app/dashboards#/view/${dashboardId}`
      ),
    },
  },
  spaces: {
    getActiveSpace: jest.fn().mockResolvedValue(mockSpace),
  },
};
const mockDashboard = getDashboard as jest.Mock;
const mockKibana = useKibana as jest.Mock;

describe('useGetDashboard_function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDashboard.mockResolvedValue({ data: { available: true } });
    mockKibana.mockReturnValue({
      services: mockServices,
    });
  });

  it('fetches the dashboard and sets the dashboard URL', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useGetDashboard({ connectorId }));
    await waitForNextUpdate();
    expect(mockDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId,
        dashboardId: 'generative-ai-token-usage-space',
      })
    );
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      query: {
        language: 'kuery',
        query: `kibana.saved_objects: { id  : ${connectorId} }`,
      },
      dashboardId: 'generative-ai-token-usage-space',
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.dashboardUrl).toBe(
      'http://localhost:5601/app/dashboards#/view/generative-ai-token-usage-space'
    );
  });

  it('handles the case where the dashboard is not available.', async () => {
    mockDashboard.mockResolvedValue({ data: { available: false } });
    const { result, waitForNextUpdate } = renderHook(() => useGetDashboard({ connectorId }));
    await waitForNextUpdate();
    expect(mockDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId,
        dashboardId: 'generative-ai-token-usage-space',
      })
    );
    expect(mockGetRedirectUrl).not.toHaveBeenCalled();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.dashboardUrl).toBe(null);
  });

  it('handles the case where the spaces API is not available.', async () => {
    mockKibana.mockReturnValue({
      services: { ...mockServices, spaces: null },
    });

    const { result } = renderHook(() => useGetDashboard({ connectorId }));
    expect(mockDashboard).not.toHaveBeenCalled();
    expect(mockGetRedirectUrl).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.dashboardUrl).toBe(null);
  });

  it('handles the case where connectorId is empty string', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useGetDashboard({ connectorId: '' }));
    await waitForNextUpdate();
    expect(mockDashboard).not.toHaveBeenCalled();
    expect(mockGetRedirectUrl).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.dashboardUrl).toBe(null);
  });

  it('handles the case where the dashboard locator is not available.', async () => {
    mockKibana.mockReturnValue({
      services: { ...mockServices, dashboard: {} },
    });
    const { result, waitForNextUpdate } = renderHook(() => useGetDashboard({ connectorId }));
    await waitForNextUpdate();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.dashboardUrl).toBe(null);
  });

  it('correctly handles errors and displays the appropriate toast messages.', async () => {
    mockDashboard.mockRejectedValue(new Error('Error fetching dashboard'));
    const { result, waitForNextUpdate } = renderHook(() => useGetDashboard({ connectorId }));
    await waitForNextUpdate();
    expect(result.current.isLoading).toBe(false);
    expect(mockToasts.addDanger).toHaveBeenCalledWith({
      title: 'Error finding Generative AI Token Usage Dashboard.',
      text: 'Error fetching dashboard',
    });
  });
});
