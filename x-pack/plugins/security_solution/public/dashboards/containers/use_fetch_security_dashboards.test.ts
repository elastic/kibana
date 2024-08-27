/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpStart } from '@kbn/core/public';
import { renderHook, act } from '@testing-library/react';
import { DashboardContextProvider } from '../context/dashboard_context';
import { useFetchSecurityDashboards } from './use_fetch_security_dashboards';
import { getTagsByName } from '../../common/containers/tags/api';
import { getDashboardsByTagIds } from '../../common/containers/dashboards/api';
import { useKibana } from '../../common/lib/kibana';
import { MOCK_TAG_ID } from '../../common/containers/tags/__mocks__/api';
import { DEFAULT_DASHBOARDS_RESPONSE } from '../../common/containers/dashboards/__mocks__/api';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/containers/tags/api');
jest.mock('../../common/containers/dashboards/api');

const mockHttp = {};
const mockAbortSignal = {} as unknown as AbortSignal;

const renderUseFetchSecurityDashboards = () =>
  renderHook(() => useFetchSecurityDashboards(), {
    wrapper: DashboardContextProvider,
  });

const asyncRenderUseFetchSecurityDashboards = async () => {
  const renderedHook = renderUseFetchSecurityDashboards();
  await act(async () => {
    await renderedHook.waitForNextUpdate();
  });
  return renderedHook;
};

describe('useFetchSecurityDashboards', () => {
  beforeAll(() => {
    useKibana().services.http = mockHttp as unknown as HttpStart;

    global.AbortController = jest.fn().mockReturnValue({
      abort: jest.fn(),
      signal: mockAbortSignal,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch Security Solution tags', async () => {
    await asyncRenderUseFetchSecurityDashboards();
    expect(getTagsByName).toHaveBeenCalledTimes(1);
  });

  it('should fetch Security Solution dashboards', async () => {
    await asyncRenderUseFetchSecurityDashboards();

    expect(getDashboardsByTagIds).toHaveBeenCalledTimes(1);
    expect(getDashboardsByTagIds).toHaveBeenCalledWith(
      {
        http: mockHttp,
        tagIds: [MOCK_TAG_ID],
      },
      expect.any(Object)
    );
  });

  it('should fetch Security Solution dashboards with abort signal', async () => {
    await asyncRenderUseFetchSecurityDashboards();

    expect(getDashboardsByTagIds).toHaveBeenCalledTimes(1);
    expect((getDashboardsByTagIds as jest.Mock).mock.calls[0][1]).toEqual(mockAbortSignal);
  });

  it('should return Security Solution dashboards', async () => {
    const { result } = await asyncRenderUseFetchSecurityDashboards();

    expect(result.current.isLoading).toEqual(false);
    expect(result.current.dashboards).toEqual(DEFAULT_DASHBOARDS_RESPONSE);
  });
});
