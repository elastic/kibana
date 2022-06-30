/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UseQueryResult } from 'react-query/types/react/types';
import { createCspBenchmarkIntegrationFixture } from '../../test/fixtures/csp_benchmark_integration';
import { createReactQueryResponse } from '../../test/fixtures/react_query';
import { TestProvider } from '../../test/test_provider';
import { Benchmarks } from './benchmarks';
import * as TEST_SUBJ from './test_subjects';
import { useCspBenchmarkIntegrations } from './use_csp_benchmark_integrations';
import { useCisKubernetesIntegration } from '../../common/api/use_cis_kubernetes_integration';

jest.mock('./use_csp_benchmark_integrations');
jest.mock('../../common/api/use_cis_kubernetes_integration');

describe('<Benchmarks />', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    // if package installation status is 'not_installed', CspPageTemplate will render a noDataConfig prompt
    (useCisKubernetesIntegration as jest.Mock).mockImplementation(() => ({
      data: { item: { status: 'installed' } },
    }));
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

    expect(screen.getByTestId(TEST_SUBJ.BENCHMARKS_PAGE_HEADER)).toBeInTheDocument();
  });

  it('renders the "add integration" button', () => {
    renderBenchmarks();

    expect(screen.getByTestId(TEST_SUBJ.ADD_INTEGRATION_TEST_SUBJ)).toBeInTheDocument();
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
        data: { total: 1, items: [createCspBenchmarkIntegrationFixture()] },
      })
    );

    expect(screen.getByTestId(TEST_SUBJ.BENCHMARKS_TABLE_DATA_TEST_SUBJ)).toBeInTheDocument();
    Object.values(TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS).forEach((testId) =>
      expect(screen.getAllByTestId(testId)[0]).toBeInTheDocument()
    );
  });
});
