/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Rules } from '.';
import { render, screen } from '@testing-library/react';
import { QueryClient } from 'react-query';
import { TestProvider } from '../../test/test_provider';
import { useCspIntegrationInfo } from './use_csp_integration';
import { type RouteComponentProps } from 'react-router-dom';
import type { PageUrlParams } from './rules_container';
import * as TEST_SUBJECTS from './test_subjects';
import { useCisKubernetesIntegration } from '../../common/api/use_cis_kubernetes_integration';
import { createReactQueryResponse } from '../../test/fixtures/react_query';
import { coreMock } from '@kbn/core/public/mocks';

jest.mock('./use_csp_integration', () => ({
  useCspIntegrationInfo: jest.fn(),
}));
jest.mock('../../common/api/use_cis_kubernetes_integration');

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

    (useCisKubernetesIntegration as jest.Mock).mockImplementation(() => ({
      data: { item: { status: 'installed' } },
    }));
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

  it('displays error state when request had an error', async () => {
    const Component = getTestComponent({ packagePolicyId: '1', policyId: '2' });
    const request = createReactQueryResponse({
      status: 'error',
      error: new Error('some error message'),
    });

    (useCspIntegrationInfo as jest.Mock).mockReturnValue(request);

    render(<Component />);

    expect(await screen.findByText(request.error?.message!)).toBeInTheDocument();
  });

  it('displays success state when result request is resolved', async () => {
    const Component = getTestComponent({ packagePolicyId: '21', policyId: '22' });
    const request = createReactQueryResponse({
      status: 'success',
      data: [
        {
          name: 'CIS Kubernetes Benchmark',
          package: {
            title: 'my package',
          },
        },
        { name: 'my agent' },
      ],
    });

    (useCspIntegrationInfo as jest.Mock).mockReturnValue(request);

    render(<Component />);

    expect(
      await screen.findByText(`${request.data?.[0]?.package?.title}, ${request.data?.[1].name}`)
    ).toBeInTheDocument();
    expect(await screen.findByTestId(TEST_SUBJECTS.CSP_RULES_CONTAINER)).toBeInTheDocument();
  });
});
