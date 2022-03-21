/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult } from 'react-query/types/react/types';
import { createStubDataView } from '../../../../../../src/plugins/data_views/public/data_views/data_view.stub';
import { CSP_KUBEBEAT_INDEX_PATTERN } from '../../../common/constants';
import { useKubebeatDataView } from '../../common/api/use_kubebeat_data_view';
import { createCspBenchmarkIntegrationFixture } from '../../test/fixtures/csp_benchmark_integration';
import { createReactQueryResponse } from '../../test/fixtures/react_query';
import { TestProvider } from '../../test/test_provider';
import { Benchmarks, BENCHMARKS_TABLE_DATA_TEST_SUBJ } from './benchmarks';
import {
  ADD_A_CIS_INTEGRATION,
  BENCHMARK_INTEGRATIONS,
  TABLE_COLUMN_HEADERS,
} from './translations';
import { useCspBenchmarkIntegrations } from './use_csp_benchmark_integrations';
import { useCisKubernetesIntegration } from '../../common/api/use_cis_kubernetes_integration';

jest.mock('./use_csp_benchmark_integrations');
jest.mock('../../common/api/use_kubebeat_data_view');
jest.mock('../../common/api/use_cis_kubernetes_integration');

describe('<Benchmarks />', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    // if package installation status is 'not_installed', CspPageTemplate will render a noDataConfig prompt
    (useCisKubernetesIntegration as jest.Mock).mockImplementation(() => ({ status: 'installed' }));
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

  it('supports sorting the table by integrations', () => {
    renderBenchmarks(
      createReactQueryResponse({
        status: 'success',
        data: [createCspBenchmarkIntegrationFixture()],
      })
    );

    // The table is sorted by integrations ascending by default, asserting that
    const sortedHeaderAscending = screen
      .getAllByRole('columnheader')
      .find((element) => element.getAttribute('aria-sort') === 'ascending');

    expect(sortedHeaderAscending).toBeInTheDocument();
    expect(
      within(sortedHeaderAscending!).getByText(TABLE_COLUMN_HEADERS.INTEGRATION)
    ).toBeInTheDocument();

    // A click should now sort it by descending
    userEvent.click(screen.getByText(TABLE_COLUMN_HEADERS.INTEGRATION));

    const sortedHeaderDescending = screen
      .getAllByRole('columnheader')
      .find((element) => element.getAttribute('aria-sort') === 'descending');
    expect(sortedHeaderDescending).toBeInTheDocument();
    expect(
      within(sortedHeaderDescending!).getByText(TABLE_COLUMN_HEADERS.INTEGRATION)
    ).toBeInTheDocument();
  });

  it('supports sorting the table by integration type, created by, and created at columns', () => {
    renderBenchmarks(
      createReactQueryResponse({
        status: 'success',
        data: [createCspBenchmarkIntegrationFixture()],
      })
    );

    [
      TABLE_COLUMN_HEADERS.INTEGRATION_TYPE,
      TABLE_COLUMN_HEADERS.CREATED_AT,
      TABLE_COLUMN_HEADERS.CREATED_AT,
    ].forEach((columnHeader) => {
      const headerTextElement = screen.getByText(columnHeader);
      expect(headerTextElement).toBeInTheDocument();

      // Click on the header element to sort the column in ascending order
      userEvent.click(headerTextElement!);

      const sortedHeaderAscending = screen
        .getAllByRole('columnheader')
        .find((element) => element.getAttribute('aria-sort') === 'ascending');
      expect(within(sortedHeaderAscending!).getByText(columnHeader)).toBeInTheDocument();

      // Click on the header element again to sort the column in descending order
      userEvent.click(headerTextElement!);

      const sortedHeaderDescending = screen
        .getAllByRole('columnheader')
        .find((element) => element.getAttribute('aria-sort') === 'descending');
      expect(within(sortedHeaderDescending!).getByText(columnHeader)).toBeInTheDocument();
    });
  });
});
