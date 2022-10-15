/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { EntityAnalyticsAnomalies } from '.';
import type { AnomaliesCount } from '../../../../common/components/ml/anomaly/use_anomalies_search';
import {
  AnomalyJobStatus,
  AnomalyEntity,
} from '../../../../common/components/ml/anomaly/use_anomalies_search';

import { TestProviders } from '../../../../common/mock';

const mockUseNotableAnomaliesSearch = jest.fn().mockReturnValue({
  isLoading: false,
  data: [],
  refetch: jest.fn(),
});

jest.mock('../../../../common/components/ml/anomaly/use_anomalies_search', () => {
  const original = jest.requireActual(
    '../../../../common/components/ml/anomaly/use_anomalies_search'
  );
  return {
    ...original,
    useNotableAnomaliesSearch: () => mockUseNotableAnomaliesSearch(),
  };
});

jest.mock('@kbn/ml-plugin/public', () => {
  const original = jest.requireActual('@kbn/ml-plugin/public');

  return {
    ...original,
    useMlHref: () => 'http://jobsUrl',
  };
});

describe('EntityAnalyticsAnomalies', () => {
  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    expect(getByTestId('entity_analytics_anomalies')).toBeInTheDocument();
  });

  it('renders links to anomalies pages', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    expect(getByTestId('anomalies_table_hosts_link')).toBeInTheDocument();
    expect(getByTestId('anomalies_table_users_link')).toBeInTheDocument();
    expect(getByTestId('anomalies_table_all')).toBeInTheDocument();
  });

  it('renders enabled jobs', () => {
    const jobCount: AnomaliesCount = {
      jobId: 'v3_windows_anomalous_script',
      name: 'v3_windows_anomalous_script',
      count: 9999,
      status: AnomalyJobStatus.enabled,
      entity: AnomalyEntity.User,
    };

    mockUseNotableAnomaliesSearch.mockReturnValue({
      isLoading: false,
      data: [jobCount],
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    expect(getByTestId('anomalies-table-column-name')).toHaveTextContent(jobCount.name);
    expect(getByTestId('anomalies-table-column-count')).toHaveTextContent(
      jobCount.count.toString()
    );
  });

  it('renders disabled jobs', () => {
    const jobCount: AnomaliesCount = {
      jobId: 'v3_windows_anomalous_script',
      name: 'v3_windows_anomalous_script',
      count: 0,
      status: AnomalyJobStatus.disabled,
      entity: AnomalyEntity.User,
    };

    mockUseNotableAnomaliesSearch.mockReturnValue({
      isLoading: false,
      data: [jobCount],
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    expect(getByTestId('anomalies-table-column-name')).toHaveTextContent(jobCount.name);
    expect(getByTestId('anomalies-table-column-count')).toHaveTextContent('Run job');
    expect(getByTestId('jobs-table-link')).toBeInTheDocument();
  });

  it('renders uninstalled jobs', () => {
    const jobCount: AnomaliesCount = {
      jobId: 'v3_windows_anomalous_script',
      name: 'v3_windows_anomalous_script',
      count: 0,
      status: AnomalyJobStatus.uninstalled,
      entity: AnomalyEntity.User,
    };

    mockUseNotableAnomaliesSearch.mockReturnValue({
      isLoading: false,
      data: [jobCount],
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    expect(getByTestId('anomalies-table-column-name')).toHaveTextContent(jobCount.name);
    expect(getByTestId('anomalies-table-column-count')).toHaveTextContent('uninstalled');
  });

  it('renders failed jobs', () => {
    const jobCount: AnomaliesCount = {
      jobId: 'v3_windows_anomalous_script',
      name: 'v3_windows_anomalous_script',
      count: 0,
      status: AnomalyJobStatus.failed,
      entity: AnomalyEntity.User,
    };

    mockUseNotableAnomaliesSearch.mockReturnValue({
      isLoading: false,
      data: [jobCount],
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    expect(getByTestId('anomalies-table-column-name')).toHaveTextContent(jobCount.name);
    expect(getByTestId('anomalies-table-column-count')).toHaveTextContent('failed');
  });

  it('renders empty count column while loading', () => {
    const jobCount: AnomaliesCount = {
      jobId: 'v3_windows_anomalous_script',
      name: 'v3_windows_anomalous_script',
      count: 0,
      status: AnomalyJobStatus.failed,
      entity: AnomalyEntity.User,
    };

    mockUseNotableAnomaliesSearch.mockReturnValue({
      isLoading: true,
      data: [jobCount],
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    expect(getByTestId('anomalies-table-column-count').textContent).toEqual('Count'); // 'Count' is always rendered by only displayed on mobile
  });
});
