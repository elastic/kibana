/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import Chance from 'chance';
import { Rules } from '.';
import { render, screen } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { TestProvider } from '../../test/test_provider';
import { type RouteComponentProps } from 'react-router-dom';
import { PageUrlParams } from '../../../common/types/latest';
import { createReactQueryResponse } from '../../test/fixtures/react_query';
import { coreMock } from '@kbn/core/public/mocks';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { useSubscriptionStatus } from '../../common/hooks/use_subscription_status';
import { useCspIntegrationLink } from '../../common/navigation/use_csp_integration_link';
import { useLicenseManagementLocatorApi } from '../../common/api/use_license_management_locator_api';
import { useCspBenchmarkIntegrationsV2 } from '../benchmarks/use_csp_benchmark_integrations';
import * as TEST_SUBJECTS from './test_subjects';

jest.mock('../../common/api/use_setup_status_api');
jest.mock('../../common/api/use_license_management_locator_api');
jest.mock('../../common/hooks/use_subscription_status');
jest.mock('../../common/navigation/use_csp_integration_link');
jest.mock('../benchmarks/use_csp_benchmark_integrations', () => ({
  useCspBenchmarkIntegrationsV2: jest.fn(),
}));

const chance = new Chance();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const getTestComponent =
  (params: PageUrlParams): React.FC =>
  () => {
    const coreStart = coreMock.createStart();
    const core = {
      ...coreStart,
      application: {
        ...coreStart.application,
        capabilities: {
          ...coreStart.application.capabilities,
          siem: { crud: true },
        },
      },
    };
    return (
      <TestProvider core={core}>
        <Rules
          {...({
            match: { params },
          } as RouteComponentProps<PageUrlParams>)}
        />
      </TestProvider>
    );
  };

describe('<Rules />', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          cspm: { status: 'indexed' },
          kspm: { status: 'indexed' },
          indicesDetails: [
            { index: 'logs-cloud_security_posture.findings_latest-default', status: 'not-empty' },
            { index: 'logs-cloud_security_posture.findings-default*', status: 'not-empty' },
          ],
        },
      })
    );

    (useSubscriptionStatus as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: true,
      })
    );

    (useLicenseManagementLocatorApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: true,
      })
    );

    (useCspIntegrationLink as jest.Mock).mockImplementation(() => chance.url());
  });

  it('calls Benchmark API', async () => {
    const params: PageUrlParams = { benchmarkId: 'cis_eks', benchmarkVersion: '1.9.1' };
    const Component = getTestComponent(params);
    const result = createReactQueryResponse({
      status: 'loading',
    });

    (useCspBenchmarkIntegrationsV2 as jest.Mock).mockReturnValue(result);

    render(<Component />);

    expect(useCspBenchmarkIntegrationsV2).toHaveBeenCalled();
  });

  it('Display success state when result request is resolved', async () => {
    const params: PageUrlParams = { benchmarkId: 'cis_eks', benchmarkVersion: '1.9.1' };
    const Component = getTestComponent(params);
    const result = createReactQueryResponse({
      status: 'success',
      data: {
        items: [
          {
            evaluation: 1,
            id: 'cis_k8s',
            name: 'CIS Kubernetes V1.23',
            score: {
              postureScore: 50,
              totalFailed: 1,
              totalFindings: 0,
              totalPassed: 1,
            },
            version: '1.0.1',
          },
        ],
      },
    });

    (useCspBenchmarkIntegrationsV2 as jest.Mock).mockReturnValue(result);

    render(<Component />);

    expect(await screen.findByTestId(TEST_SUBJECTS.CSP_RULES_CONTAINER)).toBeInTheDocument();
    expect(useCspBenchmarkIntegrationsV2).toHaveBeenCalled();
  });
});
