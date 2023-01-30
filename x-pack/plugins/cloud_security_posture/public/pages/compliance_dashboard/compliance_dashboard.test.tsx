/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import Chance from 'chance';
import { coreMock } from '@kbn/core/public/mocks';
import { render } from '@testing-library/react';
import { TestProvider } from '../../test/test_provider';
import { ComplianceDashboard } from '.';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { useSubscriptionStatus } from '../../common/hooks/use_subscription_status';
import { useKspmStatsApi, useCspmStatsApi } from '../../common/api/use_stats_api';
import {
  CLOUD_DASHBOARD_CONTAINER,
  DASHBOARD_CONTAINER,
  KUBERNETES_DASHBOARD_CONTAINER,
} from './test_subjects';
import { createReactQueryResponse } from '../../test/fixtures/react_query';
import { NO_FINDINGS_STATUS_TEST_SUBJ } from '../../components/test_subjects';
import { useCISIntegrationPoliciesLink } from '../../common/navigation/use_navigate_to_cis_integration_policies';
import { useCspIntegrationLink } from '../../common/navigation/use_csp_integration_link';
import { expectIdsInDoc } from '../../test/utils';
import { ComplianceDashboardData } from '../../../common/types';

jest.mock('../../common/api/use_setup_status_api');
jest.mock('../../common/api/use_stats_api');
jest.mock('../../common/hooks/use_subscription_status');
jest.mock('../../common/navigation/use_navigate_to_cis_integration_policies');
jest.mock('../../common/navigation/use_csp_integration_link');

const chance = new Chance();

export const mockDashboardData: ComplianceDashboardData = {
  stats: {
    totalFailed: 17,
    totalPassed: 155,
    totalFindings: 172,
    postureScore: 90.1,
    resourcesEvaluated: 162,
  },
  groupedFindingsEvaluation: [
    {
      name: 'RBAC and Service Accounts',
      totalFindings: 104,
      totalFailed: 0,
      totalPassed: 104,
      postureScore: 100,
    },
    {
      name: 'API Server',
      totalFindings: 27,
      totalFailed: 11,
      totalPassed: 16,
      postureScore: 59.2,
    },
    {
      name: 'Master Node Configuration Files',
      totalFindings: 17,
      totalFailed: 1,
      totalPassed: 16,
      postureScore: 94.1,
    },
    {
      name: 'Kubelet',
      totalFindings: 11,
      totalFailed: 4,
      totalPassed: 7,
      postureScore: 63.6,
    },
    {
      name: 'etcd',
      totalFindings: 6,
      totalFailed: 0,
      totalPassed: 6,
      postureScore: 100,
    },
    {
      name: 'Worker Node Configuration Files',
      totalFindings: 5,
      totalFailed: 0,
      totalPassed: 5,
      postureScore: 100,
    },
    {
      name: 'Scheduler',
      totalFindings: 2,
      totalFailed: 1,
      totalPassed: 1,
      postureScore: 50.0,
    },
  ],
  clusters: [
    {
      meta: {
        clusterId: '8f9c5b98-cc02-4827-8c82-316e2cc25870',
        benchmarkName: 'CIS Kubernetes V1.20',
        lastUpdate: '2022-11-07T13:14:34.990Z',
        benchmarkId: 'cis_k8s',
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
          postureScore: 100,
        },
        {
          name: 'API Server',
          totalFindings: 27,
          totalFailed: 11,
          totalPassed: 16,
          postureScore: 59.2,
        },
        {
          name: 'Master Node Configuration Files',
          totalFindings: 17,
          totalFailed: 1,
          totalPassed: 16,
          postureScore: 94.1,
        },
        {
          name: 'Kubelet',
          totalFindings: 11,
          totalFailed: 4,
          totalPassed: 7,
          postureScore: 63.6,
        },
        {
          name: 'etcd',
          totalFindings: 6,
          totalFailed: 0,
          totalPassed: 6,
          postureScore: 100,
        },
        {
          name: 'Worker Node Configuration Files',
          totalFindings: 5,
          totalFailed: 0,
          totalPassed: 5,
          postureScore: 100,
        },
        {
          name: 'Scheduler',
          totalFindings: 2,
          totalFailed: 1,
          totalPassed: 1,
          postureScore: 50.0,
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
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: { status: 'indexed' },
      })
    );

    (useSubscriptionStatus as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: true,
      })
    );

    (useCspmStatsApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
      })
    );
    (useKspmStatsApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
      })
    );
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

  it('no findings state: not-deployed - shows NotDeployed instead of dashboard', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: { status: 'not-deployed', installedPolicyTemplates: [] },
      })
    );
    (useCISIntegrationPoliciesLink as jest.Mock).mockImplementation(() => chance.url());
    (useCspIntegrationLink as jest.Mock).mockImplementation(() => chance.url());

    renderComplianceDashboardPage();

    expectIdsInDoc({
      be: [NO_FINDINGS_STATUS_TEST_SUBJ.NO_AGENTS_DEPLOYED],
      notToBe: [
        DASHBOARD_CONTAINER,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEXING,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEX_TIMEOUT,
        NO_FINDINGS_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('no findings state: indexing - shows Indexing instead of dashboard', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: { status: 'indexing', installedPolicyTemplates: [] },
      })
    );
    (useCspIntegrationLink as jest.Mock).mockImplementation(() => chance.url());

    renderComplianceDashboardPage();

    expectIdsInDoc({
      be: [NO_FINDINGS_STATUS_TEST_SUBJ.INDEXING],
      notToBe: [
        DASHBOARD_CONTAINER,
        NO_FINDINGS_STATUS_TEST_SUBJ.NO_AGENTS_DEPLOYED,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEX_TIMEOUT,
        NO_FINDINGS_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('no findings state: index-timeout - shows IndexTimeout instead of dashboard', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: { status: 'index-timeout', installedPolicyTemplates: [] },
      })
    );
    (useCspIntegrationLink as jest.Mock).mockImplementation(() => chance.url());

    renderComplianceDashboardPage();

    expectIdsInDoc({
      be: [NO_FINDINGS_STATUS_TEST_SUBJ.INDEX_TIMEOUT],
      notToBe: [
        DASHBOARD_CONTAINER,
        NO_FINDINGS_STATUS_TEST_SUBJ.NO_AGENTS_DEPLOYED,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEXING,
        NO_FINDINGS_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('no findings state: unprivileged - shows Unprivileged instead of dashboard', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: { status: 'unprivileged', installedPolicyTemplates: [] },
      })
    );
    (useCspIntegrationLink as jest.Mock).mockImplementation(() => chance.url());

    renderComplianceDashboardPage();

    expectIdsInDoc({
      be: [NO_FINDINGS_STATUS_TEST_SUBJ.UNPRIVILEGED],
      notToBe: [
        DASHBOARD_CONTAINER,
        NO_FINDINGS_STATUS_TEST_SUBJ.NO_AGENTS_DEPLOYED,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEXING,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEX_TIMEOUT,
      ],
    });
  });

  it('shows dashboard when there are findings in latest findings index', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: { status: 'indexed', installedPolicyTemplates: ['cspm', 'kspm'] },
      })
    );
    (useKspmStatsApi as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: mockDashboardData,
    }));
    (useCspmStatsApi as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: mockDashboardData,
    }));

    renderComplianceDashboardPage();

    expectIdsInDoc({
      be: [DASHBOARD_CONTAINER],
      notToBe: [
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEX_TIMEOUT,
        NO_FINDINGS_STATUS_TEST_SUBJ.NO_AGENTS_DEPLOYED,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEXING,
        NO_FINDINGS_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('Show Kubernetes dashboard if there are KSPM findings', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: { status: 'indexed', installedPolicyTemplates: ['cspm', 'kspm'] },
      })
    );
    (useKspmStatsApi as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: mockDashboardData,
    }));
    (useCspmStatsApi as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: undefined,
    }));

    renderComplianceDashboardPage();

    expectIdsInDoc({
      be: [KUBERNETES_DASHBOARD_CONTAINER],
      notToBe: [
        CLOUD_DASHBOARD_CONTAINER,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEX_TIMEOUT,
        NO_FINDINGS_STATUS_TEST_SUBJ.NO_AGENTS_DEPLOYED,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEXING,
        NO_FINDINGS_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('Show Cloud dashboard if there are CSPM findings', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: { status: 'indexed', installedPolicyTemplates: ['cspm', 'kspm'] },
      })
    );
    (useKspmStatsApi as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: undefined,
    }));
    (useCspmStatsApi as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: mockDashboardData,
    }));

    renderComplianceDashboardPage();

    expectIdsInDoc({
      be: [CLOUD_DASHBOARD_CONTAINER],
      notToBe: [
        KUBERNETES_DASHBOARD_CONTAINER,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEX_TIMEOUT,
        NO_FINDINGS_STATUS_TEST_SUBJ.NO_AGENTS_DEPLOYED,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEXING,
        NO_FINDINGS_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('Show Cloud dashboard "no findings prompt" if the CSPM integration is installed without findings', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: { status: 'indexed', installedPolicyTemplates: ['cspm'] },
      })
    );
    (useKspmStatsApi as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: { stats: { totalFindings: 0 } },
    }));
    (useCspmStatsApi as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: { stats: { totalFindings: 0 } },
    }));

    renderComplianceDashboardPage();

    expectIdsInDoc({
      be: [CLOUD_DASHBOARD_CONTAINER, NO_FINDINGS_STATUS_TEST_SUBJ.NO_FINDINGS],
      notToBe: [
        KUBERNETES_DASHBOARD_CONTAINER,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEX_TIMEOUT,
        NO_FINDINGS_STATUS_TEST_SUBJ.NO_AGENTS_DEPLOYED,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEXING,
        NO_FINDINGS_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('Show Kubernetes dashboard "no findings prompt" if the KSPM integration is installed without findings', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: { status: 'indexed', installedPolicyTemplates: ['kspm'] },
      })
    );
    (useKspmStatsApi as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: { stats: { totalFindings: 0 } },
    }));
    (useCspmStatsApi as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: { stats: { totalFindings: 0 } },
    }));

    renderComplianceDashboardPage();

    expectIdsInDoc({
      be: [KUBERNETES_DASHBOARD_CONTAINER, NO_FINDINGS_STATUS_TEST_SUBJ.NO_FINDINGS],
      notToBe: [
        CLOUD_DASHBOARD_CONTAINER,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEX_TIMEOUT,
        NO_FINDINGS_STATUS_TEST_SUBJ.NO_AGENTS_DEPLOYED,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEXING,
        NO_FINDINGS_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('Prefer Cloud dashboard if both integration are installed', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: { status: 'indexed', installedPolicyTemplates: ['cspm', 'kspm'] },
      })
    );
    (useKspmStatsApi as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: { stats: { totalFindings: 0 } },
    }));
    (useCspmStatsApi as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: { stats: { totalFindings: 0 } },
    }));

    renderComplianceDashboardPage();

    expectIdsInDoc({
      be: [CLOUD_DASHBOARD_CONTAINER, NO_FINDINGS_STATUS_TEST_SUBJ.NO_FINDINGS],
      notToBe: [
        KUBERNETES_DASHBOARD_CONTAINER,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEX_TIMEOUT,
        NO_FINDINGS_STATUS_TEST_SUBJ.NO_AGENTS_DEPLOYED,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEXING,
        NO_FINDINGS_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('Prefer Cloud dashboard if both integration have findings', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: { status: 'indexed', installedPolicyTemplates: ['cspm', 'kspm'] },
      })
    );
    (useKspmStatsApi as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: mockDashboardData,
    }));
    (useCspmStatsApi as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: mockDashboardData,
    }));

    renderComplianceDashboardPage();

    expectIdsInDoc({
      be: [CLOUD_DASHBOARD_CONTAINER],
      notToBe: [
        KUBERNETES_DASHBOARD_CONTAINER,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEX_TIMEOUT,
        NO_FINDINGS_STATUS_TEST_SUBJ.NO_AGENTS_DEPLOYED,
        NO_FINDINGS_STATUS_TEST_SUBJ.INDEXING,
        NO_FINDINGS_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });
});
