/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useKibana } from '../../common/lib/kibana';
import { useCreateSecurityDashboardLink } from './use_create_security_dashboard_link';
import { DashboardContextProvider } from '../context/dashboard_context';
import { getTagsByName } from '../../common/containers/tags/api';
import React from 'react';
import { TestProviders } from '../../common/mock';

jest.mock('@kbn/security-solution-navigation/src/context');
jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));
jest.mock('../../common/containers/tags/api');
jest.mock('../../common/lib/apm/use_track_http_request');
jest.mock('../../common/components/link_to', () => ({
  useGetSecuritySolutionUrl: jest
    .fn()
    .mockReturnValue(jest.fn().mockReturnValue('/app/security/dashboards/create')),
}));

const renderUseCreateSecurityDashboardLink = () =>
  renderHook(() => useCreateSecurityDashboardLink(), {
    wrapper: ({ children }: React.PropsWithChildren<{}>) => (
      <TestProviders>
        <DashboardContextProvider>{children}</DashboardContextProvider>
      </TestProviders>
    ),
  });

const asyncRenderUseCreateSecurityDashboard = async () => {
  const renderedHook = renderUseCreateSecurityDashboardLink();

  waitFor(() => null);

  return renderedHook;
};

describe('useCreateSecurityDashboardLink', () => {
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        savedObjectsTagging: {
          create: jest.fn(),
        },
        http: { get: jest.fn() },
      },
    });
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
      expect(result1).toEqual(result2);
    });

    it('should not re-request tag id when re-rendered', async () => {
      const { rerender } = await asyncRenderUseCreateSecurityDashboard();

      expect(getTagsByName).toHaveBeenCalledTimes(1);
      act(() => rerender());
      expect(getTagsByName).toHaveBeenCalledTimes(1);
    });

    it('should return isLoading while requesting', async () => {
      const { result } = renderUseCreateSecurityDashboardLink();

      expect(result.current.isLoading).toEqual(true);
      expect(result.current.url).toEqual('/app/security/dashboards/create');

      await waitFor(() => null);

      expect(result.current.isLoading).toEqual(false);
      expect(result.current.url).toEqual('/app/security/dashboards/create');
    });
  });
});
