/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import CspRouter from './csp_router';
import React from 'react';
import { render } from '@testing-library/react';
import { Router } from 'react-router-dom';
import type { CspPage, CspPageNavigationItem } from '../common/navigation/types';
import { CspSecuritySolutionContext } from '../types';
import { createMemoryHistory, MemoryHistory } from 'history';
import * as constants from '../common/navigation/constants';
import { QueryClientProviderProps } from '@tanstack/react-query';

jest.mock('../pages', () => ({
  Findings: () => <div data-test-subj="Findings">Findings</div>,
  ComplianceDashboard: () => <div data-test-subj="ComplianceDashboard">ComplianceDashboard</div>,
  Rules: () => <div data-test-subj="Rules">Rules</div>,
  Benchmarks: () => <div data-test-subj="Benchmarks">Benchmarks</div>,
}));

jest.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }: QueryClientProviderProps) => <>{children}</>,
  QueryClient: jest.fn(),
}));

describe('CspRouter', () => {
  const originalCloudPosturePages = { ...constants.cloudPosturePages };
  const mockConstants = constants as { cloudPosturePages: Record<CspPage, CspPageNavigationItem> };

  const securityContext: CspSecuritySolutionContext = {
    getFiltersGlobalComponent: jest.fn(),
    getSpyRouteComponent: () => () => <div data-test-subj="mockedSpyRoute" />,
  };

  let history: MemoryHistory;

  const renderCspRouter = () =>
    render(
      <Router history={history}>
        <CspRouter securitySolutionContext={securityContext} />
      </Router>
    );

  beforeEach(() => {
    mockConstants.cloudPosturePages = originalCloudPosturePages;
    jest.clearAllMocks();
    history = createMemoryHistory();
  });

  describe('happy path', () => {
    it('should render Findings', () => {
      history.push('/cloud_security_posture/findings');
      const result = renderCspRouter();

      expect(result.queryByTestId('Findings')).toBeInTheDocument();
      expect(result.queryByTestId('ComplianceDashboard')).not.toBeInTheDocument();
      expect(result.queryByTestId('Benchmarks')).not.toBeInTheDocument();
      expect(result.queryByTestId('Rules')).not.toBeInTheDocument();
    });

    it('should render Dashboards', () => {
      history.push('/cloud_security_posture/dashboard');
      const result = renderCspRouter();

      expect(result.queryByTestId('ComplianceDashboard')).toBeInTheDocument();
      expect(result.queryByTestId('Findings')).not.toBeInTheDocument();
      expect(result.queryByTestId('Benchmarks')).not.toBeInTheDocument();
      expect(result.queryByTestId('Rules')).not.toBeInTheDocument();
    });

    it('should render Benchmarks', () => {
      history.push('/cloud_security_posture/benchmarks');
      const result = renderCspRouter();

      expect(result.queryByTestId('Benchmarks')).toBeInTheDocument();
      expect(result.queryByTestId('Findings')).not.toBeInTheDocument();
      expect(result.queryByTestId('ComplianceDashboard')).not.toBeInTheDocument();
      expect(result.queryByTestId('Rules')).not.toBeInTheDocument();
    });

    it('should render Rules', () => {
      history.push('/cloud_security_posture/benchmarks/packagePolicyId/policyId/rules');
      const result = renderCspRouter();

      expect(result.queryByTestId('Rules')).toBeInTheDocument();
      expect(result.queryByTestId('Findings')).not.toBeInTheDocument();
      expect(result.queryByTestId('ComplianceDashboard')).not.toBeInTheDocument();
      expect(result.queryByTestId('Benchmarks')).not.toBeInTheDocument();
    });
  });

  describe('unhappy path', () => {
    it('should redirect base path to dashboard', () => {
      history.push('/cloud_security_posture/some_wrong_path');
      const result = renderCspRouter();

      expect(history.location.pathname).toEqual('/cloud_security_posture/dashboard');
      expect(result.queryByTestId('ComplianceDashboard')).toBeInTheDocument();
    });
  });

  describe('CspRoute', () => {
    it('should not render disabled path', () => {
      mockConstants.cloudPosturePages = {
        ...constants.cloudPosturePages,
        benchmarks: {
          ...constants.cloudPosturePages.benchmarks,
          disabled: true,
        },
      };

      history.push('/cloud_security_posture/benchmarks');
      const result = renderCspRouter();

      expect(result.queryByTestId('ComplianceDashboard')).not.toBeInTheDocument();
    });

    it('should render SpyRoute for static paths', () => {
      history.push('/cloud_security_posture/benchmarks');
      const result = renderCspRouter();

      expect(result.queryByTestId('mockedSpyRoute')).toBeInTheDocument();
    });

    it('should not render SpyRoute for dynamic paths', () => {
      history.push('/cloud_security_posture/benchmarks/packagePolicyId/policyId/rules');
      const result = renderCspRouter();

      expect(result.queryByTestId('mockedSpyRoute')).not.toBeInTheDocument();
    });
  });
});
