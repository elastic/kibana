/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
} from '../../test/handlers/cspm_status_handlers';
import { getMockServerCoreSetup, setupMockServiceWorker } from '../../test/mock_server';

const server = setupMockServiceWorker();

const renderVulnerabilitiesPage = () => {
  const core = getMockServerCoreSetup();

  return render(
    <TestProvider core={core}>
      <Vulnerabilities />
    </TestProvider>
  );
};

describe('<Vulnerabilities />', () => {
  beforeAll(() =>
    server.listen({
      onUnhandledRequest: 'warn',
    })
  );
  beforeEach(() => {
    server.resetHandlers();
  });
  afterAll(() => server.close());

  it('No vulnerabilities  state: not-deployed - shows NotDeployed instead of vulnerabilities ', async () => {
    server.use(cspmStatusCspmNotDeployed);

    const { getByText } = renderVulnerabilitiesPage();

    await expect(getByText('Loading...')).toBeInTheDocument();
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
    await expect(getByText('Loading...')).toBeInTheDocument();
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

    await expect(getByText('Loading...')).toBeInTheDocument();
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

    await expect(getByText('Loading...')).toBeInTheDocument();
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

  // it("renders the success state component when 'latest vulnerabilities findings' DataView exists and request status is 'success'", async () => {
  //   const { getByText } = renderVulnerabilitiesPage();

  //   await expect(getByText('Loading...')).toBeInTheDocument();
  //   await waitFor(() => expect(getByText('Privileges required')).toBeInTheDocument());
  // });

  it('renders vuln_mgmt integrations installation prompt if vuln_mgmt integration is not installed', async () => {
    server.use(cspmStatusNotInstalled);
    const { getByText } = renderVulnerabilitiesPage();

    await expect(getByText('Loading...')).toBeInTheDocument();
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
});
