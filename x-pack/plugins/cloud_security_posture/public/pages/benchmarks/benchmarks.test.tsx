/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UseQueryResult } from 'react-query/types/react/types';
import { createStubDataView } from '../../../../../../src/plugins/data_views/public/data_views/data_view.stub';
import { CSP_KUBEBEAT_INDEX_PATTERN } from '../../../common/constants';
import { useKubebeatDataView } from '../../common/api/use_kubebeat_data_view';
import { createCspBenchmarkIntegrationFixture } from '../../test/fixtures/csp_benchmark_integration';
import { createReactQueryResponse } from '../../test/fixtures/react_query';
import { TestProvider } from '../../test/test_provider';
import { Benchmarks, BENCHMARKS_TABLE_DATA_TEST_SUBJ } from './benchmarks';
import { ADD_A_CIS_INTEGRATION, BENCHMARK_INTEGRATIONS } from './translations';
import { useCspBenchmarkIntegrations } from './use_csp_benchmark_integrations';

jest.mock('./use_csp_benchmark_integrations');
jest.mock('../../common/api/use_kubebeat_data_view');

describe('<Benchmarks />', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Required for the page template to render the benchmarks page
    (useKubebeatDataView as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: createStubDataView({
          spec: {
            id: CSP_KUBEBEAT_INDEX_PATTERN,
          },
        }),
      })
    );
  });

  const renderBenchmarks = (
    queryResponse: Partial<UseQueryResult> = createReactQueryResponse()
  ) => {
    (useCspBenchmarkIntegrations as jest.Mock).mockImplementation(() => queryResponse);

    return render(
      <TestProvider>
        <Benchmarks />
      </TestProvider>
    );
  };

  it('renders the page header', () => {
    renderBenchmarks();

    expect(screen.getByText(BENCHMARK_INTEGRATIONS)).toBeInTheDocument();
  });

  it('renders the "add integration" button', () => {
    renderBenchmarks();

    expect(screen.getByText(ADD_A_CIS_INTEGRATION)).toBeInTheDocument();
  });

  it('renders error state while there is an error', () => {
    const error = new Error('message');
    renderBenchmarks(createReactQueryResponse({ status: 'error', error }));

    expect(screen.getByText(error.message)).toBeInTheDocument();
  });

  it('renders the benchmarks table', () => {
    renderBenchmarks(
      createReactQueryResponse({
        status: 'success',
        data: [createCspBenchmarkIntegrationFixture()],
      })
    );

    expect(screen.getByTestId(BENCHMARKS_TABLE_DATA_TEST_SUBJ)).toBeInTheDocument();
  });
});
