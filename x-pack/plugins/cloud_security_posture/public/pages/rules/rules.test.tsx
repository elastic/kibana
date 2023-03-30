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
import { useCspIntegrationInfo } from './use_csp_integration';
import { type RouteComponentProps } from 'react-router-dom';
import type { PageUrlParams } from './rules_container';
import * as TEST_SUBJECTS from './test_subjects';
import { createReactQueryResponse } from '../../test/fixtures/react_query';
import { coreMock } from '@kbn/core/public/mocks';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { useSubscriptionStatus } from '../../common/hooks/use_subscription_status';
import { useCspIntegrationLink } from '../../common/navigation/use_csp_integration_link';

jest.mock('./use_csp_integration', () => ({
  useCspIntegrationInfo: jest.fn(),
}));
jest.mock('../../common/api/use_setup_status_api');
jest.mock('../../common/hooks/use_subscription_status');
jest.mock('../../common/navigation/use_csp_integration_link');

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
        data: { status: 'indexed' },
      })
    );

    (useSubscriptionStatus as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: true,
      })
    );

    (useCspIntegrationLink as jest.Mock).mockImplementation(() => chance.url());
  });

  it('calls API with URL params', async () => {
    const params = { packagePolicyId: '1', policyId: '2' };
    const Component = getTestComponent(params);
    const result = createReactQueryResponse({
      status: 'loading',
    });

    (useCspIntegrationInfo as jest.Mock).mockReturnValue(result);

    render(<Component />);

    expect(useCspIntegrationInfo).toHaveBeenCalledWith(params);
  });

  it('displays success state when result request is resolved', async () => {
    const Component = getTestComponent({ packagePolicyId: '21', policyId: '22' });
    const response = createReactQueryResponse({
      status: 'success',
      data: [
        {
          name: 'CIS Kubernetes Benchmark',
          package: {
            title: 'my package',
          },
          inputs: [
            {
              enabled: true,
              policy_template: 'kspm',
              type: 'cloudbeat/cis_k8s',
            },
            {
              enabled: false,
              policy_template: 'kspm',
              type: 'cloudbeat/cis_eks',
            },
          ],
        },
        { name: 'my agent' },
      ],
    });

    (useCspIntegrationInfo as jest.Mock).mockReturnValue(response);

    render(<Component />);

    expect(await screen.findByTestId(TEST_SUBJECTS.CSP_RULES_CONTAINER)).toBeInTheDocument();
    expect(await screen.findByTestId(TEST_SUBJECTS.CSP_RULES_SHARED_VALUES)).toBeInTheDocument();
  });
});
