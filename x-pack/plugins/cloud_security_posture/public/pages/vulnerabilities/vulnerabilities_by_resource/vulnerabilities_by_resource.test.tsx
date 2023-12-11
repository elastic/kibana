/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { VulnerabilitiesByResource } from './vulnerabilities_by_resource';
import { TestProvider } from '../../../test/test_provider';
import { useLatestVulnerabilitiesByResource } from '../hooks/use_latest_vulnerabilities_by_resource';
import { VULNERABILITY_RESOURCE_COUNT } from './test_subjects';
import { getVulnerabilitiesByResourceData } from './__mocks__/vulnerabilities_by_resource.mock';

jest.mock('../hooks/use_latest_vulnerabilities_by_resource', () => ({
  useLatestVulnerabilitiesByResource: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('VulnerabilitiesByResource', () => {
  const dataView: any = {};

  const renderVulnerabilityByResource = () => {
    return render(
      <TestProvider>
        <VulnerabilitiesByResource dataView={dataView} />
      </TestProvider>
    );
  };

  it('renders the loading state', () => {
    (useLatestVulnerabilitiesByResource as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
    });
    renderVulnerabilityByResource();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
  it('renders the no data state', () => {
    (useLatestVulnerabilitiesByResource as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
    });

    renderVulnerabilityByResource();
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('renders the empty state component', () => {
    (useLatestVulnerabilitiesByResource as jest.Mock).mockReturnValue({
      data: { total: 0, total_vulnerabilities: 0, page: [] },
      isLoading: false,
      isFetching: false,
    });

    renderVulnerabilityByResource();
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it('renders the Table', () => {
    (useLatestVulnerabilitiesByResource as jest.Mock).mockReturnValue({
      data: getVulnerabilitiesByResourceData(),
      isLoading: false,
      isFetching: false,
    });

    renderVulnerabilityByResource();
    expect(screen.getByText(/2 resources/i)).toBeInTheDocument();
    expect(screen.getByText(/8 vulnerabilities/i)).toBeInTheDocument();
    expect(screen.getByText(/resource-id-1/i)).toBeInTheDocument();
    expect(screen.getByText(/resource-id-2/i)).toBeInTheDocument();
    expect(screen.getByText(/resource-test-1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/us-test-1/i)).toHaveLength(2);
    expect(screen.getAllByTestId(VULNERABILITY_RESOURCE_COUNT)).toHaveLength(2);
    expect(screen.getAllByTestId(VULNERABILITY_RESOURCE_COUNT)[0]).toHaveTextContent('4');
    expect(screen.getAllByTestId(VULNERABILITY_RESOURCE_COUNT)[1]).toHaveTextContent('4');
  });
});
