/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Rules } from './index';
import { render, screen } from '@testing-library/react';
import { QueryClient } from 'react-query';
import { TestProvider } from '../../test/test_provider';
import { useCspIntegration } from './use_csp_integration';
import { type RouteComponentProps } from 'react-router-dom';
import { cspLoadingStateTestId } from '../../components/csp_loading_state';
import type { PageUrlParams } from './rules_container';
import * as TEST_SUBJECTS from './test_subjects';
import { useCisKubernetesIntegration } from '../../common/api/use_cis_kubernetes_integration';

jest.mock('./use_csp_integration', () => ({
  useCspIntegration: jest.fn(),
}));
jest.mock('../../common/api/use_cis_kubernetes_integration');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const getTestComponent =
  (params: PageUrlParams): React.FC =>
  () =>
    (
      <TestProvider>
        <Rules
          {...({
            match: { params },
          } as RouteComponentProps<PageUrlParams>)}
        />
      </TestProvider>
    );

describe('<Rules />', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
    (useCisKubernetesIntegration as jest.Mock).mockImplementation(() => ({ status: 'installed' }));
  });

  it('calls API with URL params', async () => {
    const params = { packagePolicyId: '1', policyId: '2' };
    const Component = getTestComponent(params);
    const result = {
      status: 'loading',
    };

    (useCspIntegration as jest.Mock).mockReturnValue(result);

    render(<Component />);

    expect(useCspIntegration).toHaveBeenCalledWith(params);
  });

  it('displays error state when request had an error', async () => {
    const Component = getTestComponent({ packagePolicyId: '1', policyId: '2' });
    const request = {
      status: 'error',
      isError: true,
      data: null,
      error: new Error('some error message'),
    };

    (useCspIntegration as jest.Mock).mockReturnValue(request);

    render(<Component />);

    expect(await screen.findByText(request.error.message)).toBeInTheDocument();
  });

  it('displays loading state when request is pending', () => {
    const Component = getTestComponent({ packagePolicyId: '21', policyId: '22' });
    const request = {
      status: 'loading',
      isLoading: true,
    };

    (useCspIntegration as jest.Mock).mockReturnValue(request);

    render(<Component />);

    expect(screen.queryByTestId(cspLoadingStateTestId)).toBeInTheDocument();
  });

  it('displays success state when result request is resolved', async () => {
    const Component = getTestComponent({ packagePolicyId: '21', policyId: '22' });
    const request = {
      status: 'success',
      data: {
        name: 'CIS Kubernetes Benchmark',
        package: {
          title: 'my package',
        },
      },
    };

    (useCspIntegration as jest.Mock).mockReturnValue(request);

    render(<Component />);

    expect(
      await screen.findByText(`${request.data.package.title}, ${request.data.name}`)
    ).toBeInTheDocument();
    expect(await screen.findByTestId(TEST_SUBJECTS.CSP_RULES_CONTAINER)).toBeInTheDocument();
  });
});
