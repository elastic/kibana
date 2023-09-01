/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { useParams } from 'react-router-dom';
import { ResourceVulnerabilities } from './resource_vulnerabilities';
import { TestProvider } from '../../../../test/test_provider';
import { useLatestVulnerabilities } from '../../hooks/use_latest_vulnerabilities';
import { getResourceVulnerabilitiesMockData } from './__mocks__/resource_vulnerabilities.mock';
import { VULNERABILITIES_CVSS_SCORE_BADGE_SUBJ } from '../../../../components/test_subjects';

jest.mock('../../hooks/use_latest_vulnerabilities', () => ({
  useLatestVulnerabilities: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn().mockReturnValue({
    integration: undefined,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ResourceVulnerabilities', () => {
  const dataView: any = {};

  const renderVulnerabilityByResource = () => {
    return render(
      <TestProvider>
        <ResourceVulnerabilities dataView={dataView} />
      </TestProvider>
    );
  };

  it('renders the loading state', () => {
    (useLatestVulnerabilities as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
    });
    renderVulnerabilityByResource();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
  it('renders the no data state', () => {
    (useLatestVulnerabilities as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
    });

    renderVulnerabilityByResource();
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('applies the correct filter on fetch', () => {
    const resourceId = 'test';
    (useParams as jest.Mock).mockReturnValue({
      resourceId,
    });
    renderVulnerabilityByResource();
    expect(useLatestVulnerabilities).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [
              {
                term: {
                  'resource.id': resourceId,
                },
              },
            ],
            must: [],
            must_not: [],
            should: [],
          },
        },
      })
    );
  });

  it('renders the empty state component', () => {
    (useLatestVulnerabilities as jest.Mock).mockReturnValue({
      data: { total: 0, total_vulnerabilities: 0, page: [] },
      isLoading: false,
      isFetching: false,
    });

    renderVulnerabilityByResource();
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it('renders the Table', () => {
    (useLatestVulnerabilities as jest.Mock).mockReturnValue({
      data: getResourceVulnerabilitiesMockData(),
      isLoading: false,
      isFetching: false,
    });

    renderVulnerabilityByResource();

    // Header
    expect(screen.getByText(/0d103e99f17f355ba/i)).toBeInTheDocument();
    expect(screen.getByText(/us-east-1/i)).toBeInTheDocument();
    expect(
      screen.getByText(/elastic-agent-instance-a6c683d0-0977-11ee-bb0b-0af2059ffbbf/i)
    ).toBeInTheDocument();

    // Table
    expect(screen.getByText(/CVE-2022-28948/i)).toBeInTheDocument();
    expect(screen.getByTestId(VULNERABILITIES_CVSS_SCORE_BADGE_SUBJ)).toHaveTextContent(/7.5/i);
    expect(screen.getByTestId(VULNERABILITIES_CVSS_SCORE_BADGE_SUBJ)).toHaveTextContent(/v3/i);
    expect(screen.getByText(/high/i)).toBeInTheDocument();
    expect(screen.getByText(/gopkg.in\/yaml.v3/i)).toBeInTheDocument();
    expect(screen.getByText(/v3.0.0-20210107192922-496545a6307b/i)).toBeInTheDocument();
    expect(screen.getByText(/3.0.0-20220521103104-8f96da9f5d5e/i)).toBeInTheDocument();
  });
});
