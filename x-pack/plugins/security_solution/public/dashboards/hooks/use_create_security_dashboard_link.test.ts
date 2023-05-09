/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { useKibana } from '../../common/lib/kibana';
import { useCreateSecurityDashboardLink } from './use_create_security_dashboard_link';
import { DashboardContextProvider } from '../context/dashboard_context';
import { getTagsByName } from '../../common/containers/tags/api';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/containers/tags/api');
const URL = '/path';

const renderUseCreateSecurityDashboardLink = () =>
  renderHook(() => useCreateSecurityDashboardLink(), {
    wrapper: DashboardContextProvider,
  });

const asyncRenderUseCreateSecurityDashboard = async () => {
  const renderedHook = renderUseCreateSecurityDashboardLink();
  await act(async () => {
    await renderedHook.waitForNextUpdate();
  });
  return renderedHook;
};

describe('useCreateSecurityDashboardLink', () => {
  const mockGetRedirectUrl = jest.fn(() => URL);

  beforeAll(() => {
    useKibana().services.dashboard = {
      locator: { getRedirectUrl: mockGetRedirectUrl },
    } as unknown as DashboardStart;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useSecurityDashboardsTableItems', () => {
    it('should fetch Security Solution tags when renders', async () => {
      await asyncRenderUseCreateSecurityDashboard();

      expect(getTagsByName).toHaveBeenCalledTimes(1);
    });

    it('should return a memoized value when rerendered', async () => {
      const { result, rerender } = await asyncRenderUseCreateSecurityDashboard();

      const result1 = result.current;
      act(() => rerender());
      const result2 = result.current;

      expect(result1).toBe(result2);
    });

    it('should not re-request tag id when re-rendered', async () => {
      const { rerender } = await asyncRenderUseCreateSecurityDashboard();

      expect(getTagsByName).toHaveBeenCalledTimes(1);
      act(() => rerender());
      expect(getTagsByName).toHaveBeenCalledTimes(1);
    });

    it('should return isLoading while requesting', async () => {
      const { result, waitForNextUpdate } = renderUseCreateSecurityDashboardLink();

      expect(result.current.isLoading).toEqual(true);
      expect(result.current.url).toEqual('');

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current.isLoading).toEqual(false);
      expect(result.current.url).toEqual(URL);
    });
  });
});
