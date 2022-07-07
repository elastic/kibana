/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { render, screen } from '@testing-library/react';
import { TestProvider } from '../../test/test_provider';
import { ComplianceDashboard } from '..';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { NO_DATA_CONFIG_TEXT } from './translations';
import { useCisKubernetesIntegration } from '../../common/api/use_cis_kubernetes_integration';
import * as TEXT from './translations';
import { useComplianceDashboardDataApi } from '../../common/api/use_compliance_dashboard_data_api';

jest.mock('../../common/api/use_setup_status_api');
jest.mock('../../common/api/use_cis_kubernetes_integration');
jest.mock('../../common/api/use_compliance_dashboard_data_api');

const mockDashboardData = {
  stats: {
    totalFailed: 17,
    totalPassed: 155,
    totalFindings: 172,
    postureScore: 90.1,
  },
  groupedFindingsEvaluation: [
    {
      name: 'RBAC and Service Accounts',
      totalFindings: 104,
      totalFailed: 0,
      totalPassed: 104,
    },
    {
      name: 'API Server',
      totalFindings: 27,
      totalFailed: 11,
      totalPassed: 16,
    },
    {
      name: 'Master Node Configuration Files',
      totalFindings: 17,
      totalFailed: 1,
      totalPassed: 16,
    },
    {
      name: 'Kubelet',
      totalFindings: 11,
      totalFailed: 4,
      totalPassed: 7,
    },
    {
      name: 'etcd',
      totalFindings: 6,
      totalFailed: 0,
      totalPassed: 6,
    },
    {
      name: 'Worker Node Configuration Files',
      totalFindings: 5,
      totalFailed: 0,
      totalPassed: 5,
    },
    {
      name: 'Scheduler',
      totalFindings: 2,
      totalFailed: 1,
      totalPassed: 1,
    },
  ],
  clusters: [
    {
      meta: {
        clusterId: '8f9c5b98-cc02-4827-8c82-316e2cc25870',
        benchmarkName: 'CIS Kubernetes V1.20',
        lastUpdate: 1653218903921,
      },
      stats: {
        totalFailed: 17,
        totalPassed: 155,
        totalFindings: 172,
        postureScore: 90.1,
      },
      groupedFindingsEvaluation: [
        {
          name: 'RBAC and Service Accounts',
          totalFindings: 104,
          totalFailed: 0,
          totalPassed: 104,
        },
        {
          name: 'API Server',
          totalFindings: 27,
          totalFailed: 11,
          totalPassed: 16,
        },
        {
          name: 'Master Node Configuration Files',
          totalFindings: 17,
          totalFailed: 1,
          totalPassed: 16,
        },
        {
          name: 'Kubelet',
          totalFindings: 11,
          totalFailed: 4,
          totalPassed: 7,
        },
        {
          name: 'etcd',
          totalFindings: 6,
          totalFailed: 0,
          totalPassed: 6,
        },
        {
          name: 'Worker Node Configuration Files',
          totalFindings: 5,
          totalFailed: 0,
          totalPassed: 5,
        },
        {
          name: 'Scheduler',
          totalFindings: 2,
          totalFailed: 1,
          totalPassed: 1,
        },
      ],
      trend: [
        {
          timestamp: '2022-05-22T11:03:00.000Z',
          totalFindings: 172,
          totalFailed: 17,
          totalPassed: 155,
          postureScore: 90.1,
        },
        {
          timestamp: '2022-05-22T10:25:00.000Z',
          totalFindings: 172,
          totalFailed: 17,
          totalPassed: 155,
          postureScore: 90.1,
        },
      ],
    },
  ],
  trend: [
    {
      timestamp: '2022-05-22T11:03:00.000Z',
      totalFindings: 172,
      totalFailed: 17,
      totalPassed: 155,
      postureScore: 90.1,
    },
    {
      timestamp: '2022-05-22T10:25:00.000Z',
      totalFindings: 172,
      totalFailed: 17,
      totalPassed: 155,
      postureScore: 90.1,
    },
  ],
};

describe('<ComplianceDashboard />', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (useCisKubernetesIntegration as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: { item: { status: 'installed' } },
    }));
  });

  const renderComplianceDashboardPage = () => {
    const mockCore = coreMock.createStart();

    render(
      <TestProvider
        core={{
          ...mockCore,
          application: {
            ...mockCore.application,
            capabilities: {
              ...mockCore.application.capabilities,
              // This is required so that the `noDataConfig` view will show the action button
              navLinks: { integrations: true },
            },
          },
        }}
      >
        <ComplianceDashboard />
      </TestProvider>
    );
  };

  it('shows noDataConfig when status is not deployed', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() => ({
      data: { status: 'not-deployed' },
    }));
    (useComplianceDashboardDataApi as jest.Mock).mockImplementation(() => ({
      data: undefined,
    }));

    renderComplianceDashboardPage();

    Object.values(NO_DATA_CONFIG_TEXT).forEach((text) =>
      expect(screen.getAllByText(text)[0]).toBeInTheDocument()
    );
    expect(screen.queryByText(TEXT.CLOUD_POSTURE_SCORE)).not.toBeInTheDocument();
  });

  it('shows dashboard when there are findings in latest findings index', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      isSuccess: true,
      data: { status: 'indexed' },
    }));

    (useComplianceDashboardDataApi as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: mockDashboardData,
    }));

    renderComplianceDashboardPage();

    [NO_DATA_CONFIG_TEXT.BUTTON_TITLE, NO_DATA_CONFIG_TEXT.DESCRIPTION].forEach((text) =>
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    );
    expect(screen.getByText(TEXT.CLOUD_POSTURE_SCORE)).toBeInTheDocument();
  });
});
