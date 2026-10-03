/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core/public';
import React from 'react';

import { InvestigateFindingContext } from './agent_builder/investigate_finding_context';
import type { FindingItem, Repository } from './api';
import { getFindings } from './api';
import { FindingsView, firstEvidenceLocation } from './findings_view';

jest.mock('./api', () => ({
  getFindings: jest.fn(),
}));

const getFindingsMock = getFindings as jest.MockedFunction<typeof getFindings>;

const repository: Repository = {
  repository: 'chatwoot/chatwoot',
  remoteUrl: 'https://github.com/chatwoot/chatwoot.git',
  defaultRef: 'HEAD',
  enabled: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const finding: FindingItem = {
  id: 'finding-1',
  repository: 'chatwoot/chatwoot',
  revision: '0123456789abcdef0123456789abcdef01234567',
  finding_type: 'sensitive-data',
  signal_type: 'log',
  status: 'open',
  title: 'Phone number in health error log',
  summary: "Logs the channel's phone number, which is personal data.",
  evidence: [
    {
      path: 'app/services/whatsapp/embedded_signup_service.rb',
      line: 80,
      excerpt:
        'Rails.logger.error "[WHATSAPP] Health check failed for channel #{channel.phone_number}"',
    },
  ],
  candidate_id: 'app/services/whatsapp/embedded_signup_service.rb:80',
  cataloged: true,
  catalog_document_ids: ['entry-1'],
  log_level: 'error',
  created_at: '2026-10-02T22:04:54.383Z',
  updated_at: '2026-10-02T22:04:54.383Z',
};

const renderView = (
  props: Partial<React.ComponentProps<typeof FindingsView>> = {},
  investigate?: jest.Mock
) =>
  render(
    <InvestigateFindingContext.Provider value={investigate}>
      <FindingsView
        http={{} as HttpSetup}
        repositories={[repository]}
        repositoriesLoading={false}
        reloadRepositories={jest.fn()}
        {...props}
      />
    </InvestigateFindingContext.Provider>
  );

describe('FindingsView', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('loads open findings by default and reports the page context', async () => {
    getFindingsMock.mockResolvedValue({ page: 1, perPage: 25, total: 1, items: [finding] });
    const onContextChange = jest.fn();
    renderView({ onContextChange });

    await screen.findByTestId('codeIntelligenceFindingRow');
    expect(getFindingsMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statuses: ['open'], repositories: [], kinds: [], page: 1 })
    );
    expect(onContextChange).toHaveBeenLastCalledWith({
      tab: 'findings',
      repositories: [],
      statuses: ['open'],
      signalTypes: [],
      search: '',
      total: 1,
    });
  });

  it('renders a finding as a card row and opens its details flyout', async () => {
    getFindingsMock.mockResolvedValue({ page: 1, perPage: 25, total: 1, items: [finding] });
    renderView();

    const row = await screen.findByTestId('codeIntelligenceFindingRow');
    expect(within(row).getByTestId('codeIntelligenceFindingTypeBadge')).toHaveTextContent(
      'Sensitive data'
    );
    expect(within(row).getByTestId('codeIntelligenceFindingStatusBadge')).toHaveTextContent('Open');
    expect(within(row).getByTestId('codeIntelligenceSignalTypeBadge')).toHaveTextContent('Log');
    expect(row).toHaveTextContent('chatwoot/chatwoot');
    expect(row).toHaveTextContent('Phone number in health error log');
    expect(within(row).getByTestId('codeIntelligenceFindingRowSummary')).toHaveTextContent(
      'personal data'
    );
    expect(within(row).getByTestId('codeIntelligenceFindingRowLocation')).toHaveTextContent(
      'app/services/whatsapp/embedded_signup_service.rb:80'
    );
    expect(screen.queryByTestId('codeIntelligenceFindingRowInvestigate')).toBeNull();
    expect(screen.queryByTestId('codeIntelligenceFindingFlyout')).toBeNull();

    fireEvent.click(row);

    const flyout = screen.getByTestId('codeIntelligenceFindingFlyout');
    expect(
      within(flyout).getByRole('heading', { name: 'Phone number in health error log' })
    ).toBeInTheDocument();
    expect(within(flyout).getByTestId('codeIntelligenceFindingSummary')).toHaveTextContent(
      'personal data'
    );
    const details = within(flyout).getByTestId('codeIntelligenceFindingDetails');
    expect(within(details).getByTestId('codeIntelligenceFindingStatusBadge')).toHaveTextContent(
      'Open'
    );
    expect(within(details).getByTestId('codeIntelligenceFindingRevision')).toHaveTextContent(
      finding.revision!
    );
    expect(within(details).getByRole('rowheader', { name: 'Log level' })).toBeInTheDocument();
    expect(within(details).queryByRole('rowheader', { name: 'Review note' })).toBeNull();
    const evidence = within(flyout).getAllByTestId('codeIntelligenceFindingEvidence');
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toHaveTextContent('embedded_signup_service.rb:80');
    expect(evidence[0]).toHaveTextContent('Health check failed');
    expect(screen.queryByTestId('codeIntelligenceFindingFlyoutInvestigate')).toBeNull();
  });

  it('shows the verdict and review note of a reviewed finding', async () => {
    getFindingsMock.mockResolvedValue({
      page: 1,
      perPage: 25,
      total: 1,
      items: [
        {
          ...finding,
          status: 'verified',
          review_note: 'The phone number is written in plain text.',
          reviewed_at: '2026-10-03T06:23:38.000Z',
        },
      ],
    });
    renderView();

    fireEvent.click(await screen.findByTestId('codeIntelligenceFindingRow'));

    const details = within(screen.getByTestId('codeIntelligenceFindingFlyout')).getByTestId(
      'codeIntelligenceFindingDetails'
    );
    expect(within(details).getByTestId('codeIntelligenceFindingStatusBadge')).toHaveTextContent(
      'Verified'
    );
    expect(within(details).getByTestId('codeIntelligenceFindingReviewNote')).toHaveTextContent(
      'The phone number is written in plain text.'
    );
    expect(details).toHaveTextContent('Reviewed');
  });

  it('offers to investigate with the AI Agent from the row and the flyout', async () => {
    getFindingsMock.mockResolvedValue({ page: 1, perPage: 25, total: 1, items: [finding] });
    const investigate = jest.fn();
    renderView({}, investigate);

    const row = await screen.findByTestId('codeIntelligenceFindingRow');
    fireEvent.click(within(row).getByTestId('codeIntelligenceFindingRowInvestigate'));
    expect(investigate).toHaveBeenCalledWith(finding);
    expect(screen.queryByTestId('codeIntelligenceFindingFlyout')).toBeNull();

    fireEvent.click(row);
    fireEvent.click(screen.getByTestId('codeIntelligenceFindingFlyoutInvestigate'));
    expect(investigate).toHaveBeenCalledTimes(2);
  });

  it('refetches when the status filter changes or the refresh button is clicked', async () => {
    getFindingsMock.mockResolvedValue({ page: 1, perPage: 25, total: 0, items: [] });
    renderView();

    await screen.findByTestId('codeIntelligenceFindingsEmpty');
    expect(getFindingsMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('codeIntelligence-findingStatus-filter-button'));
    fireEvent.click(await screen.findByTestId('codeIntelligence-findingStatus-option-verified'));
    await waitFor(() => expect(getFindingsMock).toHaveBeenCalledTimes(2));
    expect(getFindingsMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ statuses: ['open', 'verified'] })
    );

    fireEvent.click(screen.getByTestId('codeIntelligenceFindingsRefreshButton'));
    await waitFor(() => expect(getFindingsMock).toHaveBeenCalledTimes(3));
  });

  it('shows the empty message when no findings match', async () => {
    getFindingsMock.mockResolvedValue({ page: 1, perPage: 25, total: 0, items: [] });
    renderView();

    expect(await screen.findByTestId('codeIntelligenceFindingsEmpty')).toHaveTextContent(
      'No findings match these filters.'
    );
  });

  it('shows a retry prompt when loading fails', async () => {
    getFindingsMock.mockRejectedValueOnce(new Error('boom'));
    getFindingsMock.mockResolvedValueOnce({ page: 1, perPage: 25, total: 0, items: [] });
    renderView();

    fireEvent.click(await screen.findByTestId('codeIntelligenceFindingsRetryButton'));
    expect(await screen.findByTestId('codeIntelligenceFindingsEmpty')).toBeInTheDocument();
  });
});

describe('firstEvidenceLocation', () => {
  it('formats path and line, path only, or nothing', () => {
    expect(firstEvidenceLocation(finding)).toBe(
      'app/services/whatsapp/embedded_signup_service.rb:80'
    );
    expect(firstEvidenceLocation({ id: 'x', evidence: [{ path: 'a.go' }] })).toBe('a.go');
    expect(firstEvidenceLocation({ id: 'x', evidence: [] })).toBeUndefined();
    expect(firstEvidenceLocation({ id: 'x' })).toBeUndefined();
  });
});
