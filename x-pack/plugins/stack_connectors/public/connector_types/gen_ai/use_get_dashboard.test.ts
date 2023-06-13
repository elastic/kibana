/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useGetDashboard } from './use_get_dashboard';
import { getDashboard } from './api';
import { waitFor } from '@testing-library/react';

jest.mock('./api');
const mockToasts = { addDanger: jest.fn() };
const mockSpace = {
  id: 'space',
  name: 'space',
  disabledFeatures: [],
};
const mockHttp = jest.fn();
const mockGetRedirectUrl = jest.fn();
jest.mock('@kbn/triggers-actions-ui-plugin/public', () => {
  // const original = jest.requireActual('@kbn/triggers-actions-ui-plugin/public');
  return {
    // ...original,
    useKibana: () => ({
      // ...original.useKibana(),
      services: {
        // ...original.useKibana().services,
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
      },
    }),
  };
});
const connectorId = '123';

describe('useGetDashboard_function', () => {
  const mockDashboard = getDashboard as jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
    mockDashboard.mockResolvedValue({ data: { available: true } });
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
    await waitFor(() => {
      expect(mockGetRedirectUrl).toHaveBeenCalledWith({
        query: {
          language: 'kuery',
          query: `kibana.saved_objects: { id  : ${connectorId} }`,
        },
        dashboardId: 'generative-ai-token-usage-space',
      });
    });
    // );
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
  //
  // it("handles the case where the spaces API is not available.", async () => {
  //   const connectorId = "123";
  //   const dashboardId = "456";
  //   const http = {
  //     post: jest.fn().mockResolvedValue({
  //       data: { available: true }
  //     })
  //   };
  //   const toasts = {
  //     addDanger: jest.fn(),
  //   };
  //   const getRedirectUrl = jest.fn().mockReturnValue(null);
  //   const locator = {
  //     getRedirectUrl,
  //   };
  //   const dashboard = {
  //     locator,
  //   };
  //   const spaces = null;
  //   const { result, waitForNextUpdate } = renderHook(() => useGetDashboard({ connectorId }), {
  //     wrapper: ({ children }) => (
  //       <KibanaContextProvider services={{ dashboard, http, notifications: { toasts }, spaces }}>
  //   {children}
  //   </KibanaContextProvider>
  // ),
  // });
  //   await waitForNextUpdate();
  //   expect(result.current.isLoading).toBe(false);
  //   expect(result.current.dashboardUrl).toBe(null);
  // });
  //
  // it("handles the case where the dashboard locator is not available.", async () => {
  //   const connectorId = "123";
  //   const dashboardId = "456";
  //   const http = {
  //     post: jest.fn().mockResolvedValue({
  //       data: { available: true }
  //     })
  //   };
  //   const toasts = {
  //     addDanger: jest.fn(),
  //   };
  //   const dashboard = {};
  //   const spaces = {
  //     getActiveSpace: jest.fn().mockResolvedValue({ id: "default" }),
  //   };
  //   const { result, waitForNextUpdate } = renderHook(() => useGetDashboard({ connectorId }), {
  //     wrapper: ({ children }) => (
  //       <KibanaContextProvider services={{ dashboard, http, notifications: { toasts }, spaces }}>
  //   {children}
  //   </KibanaContextProvider>
  // ),
  // });
  //   await waitForNextUpdate();
  //   expect(result.current.isLoading).toBe(false);
  //   expect(result.current.dashboardUrl).toBe(null);
  // });
  //
  // it("correctly sets the loading state.", async () => {
  //   const connectorId = "123";
  //   const dashboardId = "456";
  //   const http = {
  //     post: jest.fn().mockResolvedValue({
  //       data: { available: true }
  //     })
  //   };
  //   const toasts = {
  //     addDanger: jest.fn(),
  //   };
  //   const getRedirectUrl = jest.fn().mockReturnValue("http://localhost:5601/app/dashboards#/view/456");
  //   const locator = {
  //     getRedirectUrl,
  //   };
  //   const dashboard = {
  //     locator,
  //   };
  //   const spaces = {
  //     getActiveSpace: jest.fn().mockResolvedValue({ id: "default" }),
  //   };
  //   const { result, waitForNextUpdate } = renderHook(() => useGetDashboard({ connectorId }), {
  //     wrapper: ({ children }) => (
  //       <KibanaContextProvider services={{ dashboard, http, notifications: { toasts }, spaces }}>
  //   {children}
  //   </KibanaContextProvider>
  // ),
  // });
  //   expect(result.current.isLoading).toBe(true);
  //   await waitForNextUpdate();
  //   expect(result.current.isLoading).toBe(false);
  // });
  //
  // it("correctly handles errors and displays the appropriate toast messages.", async () => {
  //   const connectorId = "123";
  //   const dashboardId = "456";
  //   const http = {
  //     post: jest.fn().mockRejectedValue(new Error("Error fetching dashboard")),
  //   };
  //   const toasts = {
  //     addDanger: jest.fn(),
  //   };
  //   const getRedirectUrl = jest.fn().mockReturnValue(null);
  //   const locator = {
  //     getRedirectUrl,
  //   };
  //   const dashboard = {
  //     locator,
  //   };
  //   const spaces = {
  //     getActiveSpace: jest.fn().mockResolvedValue({ id: "default" }),
  //   };
  //   const { result, waitForNextUpdate } = renderHook(() => useGetDashboard({ connectorId }), {
  //     wrapper: ({ children }) => (
  //       <KibanaContextProvider services={{ dashboard, http, notifications: { toasts }, spaces }}>
  //   {children}
  //   </KibanaContextProvider>
  // ),
  // });
  //   await waitForNextUpdate();
  //   expect(result.current.isLoading).toBe(false);
  //   expect(toasts.addDanger).toHaveBeenCalledWith({
  //     title: "Error finding Generateive AI Token Usage Dashboard.",
  //     text: "Error fetching dashboard",
  //   });
  // });
});
