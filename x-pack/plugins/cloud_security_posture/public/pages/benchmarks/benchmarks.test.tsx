/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import Chance from 'chance';
import { render, screen } from '@testing-library/react';
import type { UseQueryResult } from '@tanstack/react-query';
import { createCspBenchmarkIntegrationFixture } from '../../test/fixtures/csp_benchmark_integration';
import { createReactQueryResponse } from '../../test/fixtures/react_query';
import { TestProvider } from '../../test/test_provider';
import { Benchmarks } from './benchmarks';
import * as TEST_SUBJ from './test_subjects';
import { useCspBenchmarkIntegrationsV2 } from './use_csp_benchmark_integrations';
import { useCspSetupStatusApi } from '@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api';
import { useCspIntegrationLink } from '../../common/navigation/use_csp_integration_link';
import { ERROR_STATE_TEST_SUBJECT } from './benchmarks_table';
import { useLicenseManagementLocatorApi } from '../../common/api/use_license_management_locator_api';

jest.mock('./use_csp_benchmark_integrations');
jest.mock('@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api');
jest.mock('../../common/api/use_license_management_locator_api');
jest.mock('../../common/hooks/use_is_subscription_status_valid');
jest.mock('../../common/navigation/use_csp_integration_link');

const chance = new Chance();

describe('<Benchmarks />', () => {
  beforeEach(() => {
    jest.resetAllMocks();
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

    (useLicenseManagementLocatorApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: true,
      })
    );

    (useCspIntegrationLink as jest.Mock).mockImplementation(() => chance.url());
  });

  const renderBenchmarks = (
    queryResponse: Partial<UseQueryResult> = createReactQueryResponse()
  ) => {
    (useCspBenchmarkIntegrationsV2 as jest.Mock).mockImplementation(() => queryResponse);

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

    expect(screen.getByTestId(ERROR_STATE_TEST_SUBJECT)).toBeInTheDocument();
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
