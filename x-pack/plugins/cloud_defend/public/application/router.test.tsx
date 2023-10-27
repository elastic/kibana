/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import CloudDefendRouter from './router';
import React from 'react';
import { render } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import type { CloudDefendPage, CloudDefendPageNavigationItem } from '../common/navigation/types';
import { CloudDefendSecuritySolutionContext } from '../types';
import { createMemoryHistory, MemoryHistory } from 'history';
import * as constants from '../common/navigation/constants';
import { QueryClientProviderProps } from '@tanstack/react-query';

jest.mock('../pages/policies', () => ({
  Policies: () => <div data-test-subj="Policies">Policies</div>,
}));

jest.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }: QueryClientProviderProps) => <>{children}</>,
  QueryClient: jest.fn(),
}));

describe('CloudDefendRouter', () => {
  const originalCloudDefendPages = { ...constants.cloudDefendPages };
  const mockConstants = constants as {
    cloudDefendPages: Record<CloudDefendPage, CloudDefendPageNavigationItem>;
  };

  const securityContext: CloudDefendSecuritySolutionContext = {
    getFiltersGlobalComponent: jest.fn(),
    getSpyRouteComponent: () => () => <div data-test-subj="mockedSpyRoute" />,
  };

  let history: MemoryHistory;

  const renderCloudDefendRouter = () =>
    render(
      <Router history={history}>
        <CloudDefendRouter securitySolutionContext={securityContext} />
      </Router>
    );

  beforeEach(() => {
    mockConstants.cloudDefendPages = originalCloudDefendPages;
    jest.clearAllMocks();
    history = createMemoryHistory();
  });

  describe('happy path', () => {
    it('should render Policies', () => {
      history.push('/cloud_defend/policies');
      const result = renderCloudDefendRouter();

      expect(result.queryByTestId('Policies')).toBeInTheDocument();
    });
  });

  describe('unhappy path', () => {
    it('should redirect base path to policies', () => {
      history.push('/cloud_defend/some_wrong_path');
      const result = renderCloudDefendRouter();

      expect(history.location.pathname).toEqual('/cloud_defend/policies');
      expect(result.queryByTestId('Policies')).toBeInTheDocument();
    });
  });

  describe('CloudDefendRoute', () => {
    it('should not render disabled path', () => {
      mockConstants.cloudDefendPages = {
        ...constants.cloudDefendPages,
        policies: {
          ...constants.cloudDefendPages.policies,
          disabled: true,
        },
      };

      history.push('/cloud_defend/policies');
      const result = renderCloudDefendRouter();

      expect(result.queryByTestId('Policies')).not.toBeInTheDocument();
    });

    it('should render SpyRoute for static paths', () => {
      history.push('/cloud_defend/policies');
      const result = renderCloudDefendRouter();

      expect(result.queryByTestId('mockedSpyRoute')).toBeInTheDocument();
    });
  });
});
