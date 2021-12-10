/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFleetTestRendererMock } from '../../../../../mock';
import type { MockedFleetStartServices } from '../../../../../mock';

import { useFleetServerUnhealthy } from './use_fleet_server_unhealthy';

function defaultHttpClientGetImplementation(path: any) {
  if (typeof path !== 'string') {
    throw new Error('Invalid request');
  }
  const err = new Error(`API [GET ${path}] is not MOCKED!`);
  // eslint-disable-next-line no-console
  console.log(err);
  throw err;
}

const mockApiCallsWithHealthyFleetServer = (http: MockedFleetStartServices['http']) => {
  http.get.mockImplementation(async (path) => {
    if (typeof path !== 'string') {
      throw new Error('Invalid request');
    }
    if (path === '/api/fleet/package_policies') {
      return {
        data: {
          items: [
            {
              policy_id: 'policy1',
            },
          ],
        },
      };
    }

    if (path === '/api/fleet/agent_status') {
      return {
        data: {
          results: { online: 1, updating: 0, offline: 0 },
        },
      };
    }
    return defaultHttpClientGetImplementation(path);
  });
};

const mockApiCallsWithoutHealthyFleetServer = (http: MockedFleetStartServices['http']) => {
  http.get.mockImplementation(async (path) => {
    if (typeof path !== 'string') {
      throw new Error('Invalid request');
    }
    if (path === '/api/fleet/package_policies') {
      return {
        data: {
          items: [
            {
              policy_id: 'policy1',
            },
          ],
        },
      };
    }

    if (path === '/api/fleet/agent_status') {
      return {
        data: {
          results: { online: 0, updating: 0, offline: 1 },
        },
      };
    }
    return defaultHttpClientGetImplementation(path);
  });
};

const mockApiCallsWithError = (http: MockedFleetStartServices['http']) => {
  http.get.mockImplementation(async (path) => {
    const error = new Error('Invalid request');
    // @ts-ignore
    error.body = 'Invalid request, ...';
    throw error;
  });
};

describe('useFleetServerUnhealthy', () => {
  it('should return isUnHealthy:false with an online fleet slerver', async () => {
    const testRenderer = createFleetTestRendererMock();
    mockApiCallsWithHealthyFleetServer(testRenderer.startServices.http);
    const { result, waitForNextUpdate } = testRenderer.renderHook(() => useFleetServerUnhealthy());
    expect(result.current.isLoading).toBeTruthy();

    await waitForNextUpdate();
    expect(result.current.isLoading).toBeFalsy();
    expect(result.current.isUnhealthy).toBeFalsy();
  });
  it('should return isUnHealthy:true with only one offline fleet slerver', async () => {
    const testRenderer = createFleetTestRendererMock();
    mockApiCallsWithoutHealthyFleetServer(testRenderer.startServices.http);
    const { result, waitForNextUpdate } = testRenderer.renderHook(() => useFleetServerUnhealthy());
    expect(result.current.isLoading).toBeTruthy();

    await waitForNextUpdate();
    expect(result.current.isLoading).toBeFalsy();
    expect(result.current.isUnhealthy).toBeTruthy();
  });

  it('should call notifications service if an error happen while fetching status', async () => {
    const testRenderer = createFleetTestRendererMock();
    mockApiCallsWithError(testRenderer.startServices.http);
    const { result, waitForNextUpdate } = testRenderer.renderHook(() => useFleetServerUnhealthy());
    expect(result.current.isLoading).toBeTruthy();

    await waitForNextUpdate();
    expect(result.current.isLoading).toBeFalsy();
    expect(result.current.isUnhealthy).toBeFalsy();
    expect(testRenderer.startServices.notifications.toasts.addError).toBeCalled();
  });
});
