/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setupMockServiceWorkerServer } from '../../test/__jest__/setup_jest_mocks';
import React from 'react';
import { Configurations } from './configurations';
import { TestProvider } from '../../test/test_provider';
import { render, waitFor } from '@testing-library/react';
import { getMockServerServicesSetup, setupMockServiceWorker } from '../../test/mock_server';
import {
  cspmStatusCspmNotDeployed,
  cspmStatusIndexed,
  cspmStatusIndexing,
  cspmStatusIndexingTimeout,
  cspmStatusNotInstalled,
  cspmStatusUnprivileged,
} from '../../test/handlers/status_handlers';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { findingsNavigation } from '../../common/navigation/constants';
import { bsearchFindingsPageDefault } from '../../test/handlers/bsearch/findings_page';
import userEvent from '@testing-library/user-event';

const renderFindingsPage = () => {
  return render(
    <TestProvider {...getMockServerServicesSetup()}>
      <MemoryRouter initialEntries={[findingsNavigation.findings_default.path]}>
        <Configurations />
      </MemoryRouter>
    </TestProvider>
  );
};

const server = setupMockServiceWorker();

describe('<Findings />', () => {
  setupMockServiceWorkerServer(server);

  it('renders integrations installation prompt if integration is not installed', async () => {
    server.use(cspmStatusNotInstalled);
    const { getByText } = renderFindingsPage();

    expect(getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => expect(getByText('Add CSPM Integration')).toBeInTheDocument());
    expect(getByText('Add KSPM Integration')).toBeInTheDocument();
  });

  it('no findings state: not-deployed - shows NotDeployed instead of findings', async () => {
    server.use(cspmStatusCspmNotDeployed);

    const { getByText } = renderFindingsPage();

    expect(getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => expect(getByText('No Agents Installed')).toBeInTheDocument());
  });

  it('no findings state: indexing - shows Indexing instead of findings', async () => {
    server.use(cspmStatusIndexing);

    const { getByText } = renderFindingsPage();
    expect(getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(getByText('Posture evaluation underway')).toBeInTheDocument();
      expect(
        getByText(
          'Waiting for data to be collected and indexed. Check back later to see your findings'
        )
      ).toBeInTheDocument();
    });
  });

  it('no findings state: index-timeout - shows IndexTimeout instead of findings', async () => {
    server.use(cspmStatusIndexingTimeout);

    const { getByText } = renderFindingsPage();
    expect(getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(getByText('Waiting for Findings data')).toBeInTheDocument();
      expect(
        getByText('Collecting findings is taking longer than expected.', { exact: false })
      ).toBeInTheDocument();
    });
  });

  it('no findings state: unprivileged - shows Unprivileged instead of findings', async () => {
    server.use(cspmStatusUnprivileged);

    const { getByText } = renderFindingsPage();
    expect(getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => expect(getByText('Privileges required')).toBeInTheDocument());
  });

  it("renders the 'latest findings' DataTable component when the status is 'indexed'", async () => {
    server.use(cspmStatusIndexed);
    server.use(bsearchFindingsPageDefault);
    const { getByText, getByTestId, getAllByText } = renderFindingsPage();

    // Loading while checking the status API
    expect(getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => expect(getByTestId('latest_findings_container')).toBeInTheDocument());
    await waitFor(() => expect(getByTestId('discoverDocTable')).toBeInTheDocument());
    // Loading while fetching the latest findings
    // TODO: currently it shows the empty component while syncing the rules states api with the latest hooks
    // Uncomment this line when the rules states api is in sync with the latest hooks
    // It's visible when setting internet connection to Slow 3G
    // expect(getByText('Loading results')).toBeInTheDocument();

    expect(
      getAllByText(
        '/subscriptions/ef111ee2-6c89-4b09-92c6-5c2321f888df/resourceGroups/AMIR-QA-RG/providers/Microsoft.Compute/disks/cloudbeatVM_OsDisk_1_e9c9210de1ea4c39973052db6cf95f9b'
      )
    ).toHaveLength(2);
    expect(getAllByText('cloudbeatVM_OsDisk_1_e9c9210de1ea4c39973052db6cf95f9b')).toHaveLength(2);
    expect(getAllByText('azure-disk')).toHaveLength(2);

    expect(getAllByText('Virtual Machines')).toHaveLength(1);
    expect(
      getAllByText(`Ensure that 'OS and Data' disks are encrypted with Customer Managed Key (CMK)`)
    ).toHaveLength(1);
    expect(getAllByText('7.3')).toHaveLength(1);

    expect(getAllByText('Logging and Monitoring')).toHaveLength(1);
    expect(
      getAllByText(
        'Ensure that SKU Basic/Consumption is not used on artifacts that need to be monitored (Particularly for Production Workloads)'
      )
    ).toHaveLength(1);
    expect(getAllByText('5.5')).toHaveLength(1);
  });

  describe('SearchBar', () => {
    it('set search query', async () => {
      server.use(cspmStatusIndexed);
      server.use(bsearchFindingsPageDefault);
      const { getByText, getByTestId, getAllByText } = renderFindingsPage();

      // Loading while checking the status API
      expect(getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => expect(getByText('Loading results')).toBeInTheDocument());
      await waitFor(() => expect(getByTestId('latest_findings_container')).toBeInTheDocument());
      await waitFor(() => expect(getByTestId('discoverDocTable')).toBeInTheDocument());

      expect(getAllByText('azure-disk')).toHaveLength(2);

      const queryInput = getByTestId('queryInput');
      userEvent.type(queryInput, 'rule.section : "Logging and Monitoring"');

      const submitButton = getByTestId('querySubmitButton');
      userEvent.click(submitButton);

      await waitFor(() => expect(getAllByText('azure-disk')).toHaveLength(1));
    });
  });
  //   it('Opens the findings flyout', async () => {
  //     server.use(cspmStatusIndexed);
  //     server.use(bsearchFindingsPageDefault);
  //     const { getByText, getByTestId, getAllByText, debug } = renderFindingsPage();

  //     // Loading while checking the status API
  //     expect(getByText('Loading...')).toBeInTheDocument();

  //     await waitFor(() => expect(getByText('Loading results')).toBeInTheDocument());
  //     await waitFor(() => expect(getByTestId('latest_findings_container')).toBeInTheDocument());
  //     await waitFor(() => expect(getByTestId('discoverDocTable')).toBeInTheDocument());

  //     expect(getAllByText('azure-disk')).toHaveLength(2);

  //     debug(undefined, 9999999);
  //     const queryInput = getByTestId('queryInput');
  //     userEvent.type(queryInput, 'rule.section : "Logging and Monitoring"');

  //     const submitButton = getByTestId('querySubmitButton');
  //     userEvent.click(submitButton);

  //     await waitFor(() => expect(getAllByText('azure-disk')).toHaveLength(1));
  //   });
  // });
});
