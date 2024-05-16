/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setupMockServiceWorkerServer } from '../../test/__jest__/setup_jest_mocks';
import React from 'react';
import { Vulnerabilities } from './vulnerabilities';
import {
  NO_VULNERABILITIES_STATUS_TEST_SUBJ,
  VULNERABILITIES_CONTAINER_TEST_SUBJ,
} from '../../components/test_subjects';
import { render, waitFor } from '@testing-library/react';
import { expectIdsInDoc } from '../../test/utils';
import { TestProvider } from '../../test/test_provider';
import {
  cspmStatusNotInstalled,
  cspmStatusIndexing,
  cspmStatusCspmNotDeployed,
  cspmStatusIndexingTimeout,
  cspmStatusUnprivileged,
  cspmStatusIndexed,
} from '../../test/handlers/status_handlers';
import { getMockServerServicesSetup, setupMockServiceWorker } from '../../test/mock_server';
import { bsearchVulnerabilitiesPageDefault } from '../../test/handlers/bsearch/vulnerabilities_page';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { findingsNavigation } from '../../common/navigation/constants';

const server = setupMockServiceWorker(true);

const renderVulnerabilitiesPage = () => {
  return render(
    <TestProvider {...getMockServerServicesSetup()}>
      <MemoryRouter initialEntries={[findingsNavigation.vulnerabilities.path]}>
        <Vulnerabilities />
      </MemoryRouter>
    </TestProvider>
  );
};

describe('<Vulnerabilities />', () => {
  setupMockServiceWorkerServer(server);

  it('No vulnerabilities  state: not-deployed - shows NotDeployed instead of vulnerabilities ', async () => {
    server.use(cspmStatusCspmNotDeployed);

    const { getByText } = renderVulnerabilitiesPage();

    expect(getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => expect(getByText('No Agents Installed')).toBeInTheDocument());

    expectIdsInDoc({
      be: [NO_VULNERABILITIES_STATUS_TEST_SUBJ.NOT_DEPLOYED],
      notToBe: [
        VULNERABILITIES_CONTAINER_TEST_SUBJ,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.NOT_INSTALLED,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.SCANNING_VULNERABILITIES,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('No vulnerabilities  state: indexing - shows Indexing instead of vulnerabilities ', async () => {
    server.use(cspmStatusIndexing);

    const { getByText } = renderVulnerabilitiesPage();
    expect(getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => expect(getByText('Scanning your environment')).toBeInTheDocument());

    expectIdsInDoc({
      be: [NO_VULNERABILITIES_STATUS_TEST_SUBJ.SCANNING_VULNERABILITIES],
      notToBe: [
        VULNERABILITIES_CONTAINER_TEST_SUBJ,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.NOT_INSTALLED,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('No vulnerabilities  state: index-timeout - shows IndexTimeout instead of vulnerabilities ', async () => {
    server.use(cspmStatusIndexingTimeout);
    const { getByText } = renderVulnerabilitiesPage();

    expect(getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => expect(getByText('Findings Delayed')).toBeInTheDocument());

    expectIdsInDoc({
      be: [NO_VULNERABILITIES_STATUS_TEST_SUBJ.INDEX_TIMEOUT],
      notToBe: [
        VULNERABILITIES_CONTAINER_TEST_SUBJ,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.SCANNING_VULNERABILITIES,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('No vulnerabilities  state: unprivileged - shows Unprivileged instead of vulnerabilities ', async () => {
    server.use(cspmStatusUnprivileged);
    const { getByText } = renderVulnerabilitiesPage();

    expect(getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => expect(getByText('Privileges required')).toBeInTheDocument());

    expectIdsInDoc({
      be: [NO_VULNERABILITIES_STATUS_TEST_SUBJ.UNPRIVILEGED],
      notToBe: [
        VULNERABILITIES_CONTAINER_TEST_SUBJ,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.NOT_INSTALLED,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.SCANNING_VULNERABILITIES,
      ],
    });
  });

  it('renders vuln_mgmt integrations installation prompt if vuln_mgmt integration is not installed', async () => {
    server.use(cspmStatusNotInstalled);
    const { getByText } = renderVulnerabilitiesPage();

    expect(getByText('Loading...')).toBeInTheDocument();
    await waitFor(() =>
      expect(getByText('Install Cloud Native Vulnerability Management')).toBeInTheDocument()
    );

    expectIdsInDoc({
      be: [NO_VULNERABILITIES_STATUS_TEST_SUBJ.NOT_INSTALLED],
      notToBe: [
        VULNERABILITIES_CONTAINER_TEST_SUBJ,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.SCANNING_VULNERABILITIES,
        NO_VULNERABILITIES_STATUS_TEST_SUBJ.UNPRIVILEGED,
      ],
    });
  });

  it('renders the success state component when "latest vulnerabilities findings" DataView exists and request status is "success"', async () => {
    server.use(cspmStatusIndexed);
    server.use(bsearchVulnerabilitiesPageDefault);
    const { getByText, getByTestId } = renderVulnerabilitiesPage();

    // Loading while checking the status API
    expect(getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => expect(getByTestId('latest_vulnerabilities_table')).toBeInTheDocument());
    // Loading while fetching the latest vulnerabilities
    expect(getByText('Loading results')).toBeInTheDocument();

    await waitFor(() => expect(getByTestId('discoverDocTable')).toBeInTheDocument());

    expect(getByText('CVE-2024-23652')).toBeInTheDocument();
    expect(getByText('10')).toBeInTheDocument();
    expect(getByText('v3')).toBeInTheDocument();
    expect(getByText('ofloros-azure-test')).toBeInTheDocument();
    expect(getByText('02e91040625827652')).toBeInTheDocument();
    expect(getByText('CRITICAL')).toBeInTheDocument();
    expect(getByText('github.com/moby/buildkit')).toBeInTheDocument();
    expect(getByText('v0.11.5')).toBeInTheDocument();
    expect(getByText('0.12.5')).toBeInTheDocument();
  });
});
