/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core/public';
import React from 'react';

import { severityForScore } from '../common/catalog_filters';
import type { CatalogItem, Repository } from './api';
import { getCatalog } from './api';
import { evidenceLanguage } from './catalog_entry_flyout';
import { CatalogView } from './catalog_view';

jest.mock('./api', () => ({
  getCatalog: jest.fn(),
}));

const getCatalogMock = getCatalog as jest.MockedFunction<typeof getCatalog>;

const repository: Repository = {
  repository: 'elastic/eis-gateway',
  remoteUrl: 'https://github.com/elastic/eis-gateway.git',
  defaultRef: 'HEAD',
  enabled: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const item: CatalogItem = {
  id: 'entry-1',
  repository: 'elastic/eis-gateway',
  revision: '0123456789abcdef0123456789abcdef01234567',
  signal_type: 'log',
  title: 'Upstream request failed',
  description: 'Logged when the gateway cannot reach the inference service.',
  query: 'FROM logs-*\n  | WHERE message LIKE "upstream request failed*"\n  | LIMIT 10',
  evidence: [
    {
      path: 'internal/proxy/handler.go',
      line: 42,
      excerpt: 'logger.Error("upstream request failed", "err", err)',
    },
  ],
  severity_score: 70,
  validation: { status: 'valid', diagnostics: [] },
  updated_at: '2026-09-30T10:00:00.000Z',
};

const otherRepository: Repository = { ...repository, repository: 'open-telemetry/demo' };

const renderView = (props: Partial<React.ComponentProps<typeof CatalogView>> = {}) =>
  render(
    <CatalogView
      http={{} as HttpSetup}
      repositories={[repository, otherRepository]}
      repositoriesLoading={false}
      reloadRepositories={jest.fn()}
      {...props}
    />
  );

describe('CatalogView', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders an entry as a card row and opens its details flyout', async () => {
    getCatalogMock.mockResolvedValue({ page: 1, perPage: 25, total: 1, items: [item] });
    renderView();

    const row = await screen.findByTestId('codeIntelligenceCatalogRow');
    expect(within(row).getByTestId('codeIntelligenceSignalTypeBadge')).toHaveTextContent('Log');
    expect(within(row).getByTestId('codeIntelligenceSeverityBadge')).toHaveTextContent('High');
    expect(row).toHaveTextContent('elastic/eis-gateway');
    expect(row).toHaveTextContent('Upstream request failed');
    expect(within(row).getByTestId('codeIntelligenceCatalogRowQuery')).toHaveTextContent(
      'FROM logs-* | WHERE message LIKE "upstream request failed*" | LIMIT 10'
    );
    expect(screen.queryByTestId('codeIntelligenceCatalogEntryFlyout')).toBeNull();

    fireEvent.click(row);

    const flyout = screen.getByTestId('codeIntelligenceCatalogEntryFlyout');
    expect(
      within(flyout).getByRole('heading', { name: 'Upstream request failed' })
    ).toBeInTheDocument();
    expect(within(flyout).getByTestId('codeIntelligenceCatalogEntryDescription')).toHaveTextContent(
      'cannot reach the inference service'
    );
    const details = within(flyout).getByTestId('codeIntelligenceCatalogEntryDetails');
    const revisionRow = within(details)
      .getByRole('rowheader', { name: 'Revision' })
      .closest('tr') as HTMLElement;
    expect(
      within(revisionRow).getByTestId('codeIntelligenceCatalogEntryRevision')
    ).toHaveTextContent(item.revision!);
    expect(within(flyout).getByTestId('codeIntelligenceCatalogEntryValidation')).toHaveTextContent(
      'valid'
    );
    expect(within(flyout).getByTestId('codeIntelligenceSeverityBadge')).toHaveTextContent('High');
    expect(within(flyout).getByTestId('codeIntelligenceCatalogEntryQuery')).toHaveTextContent(
      'upstream request failed*'
    );
    const evidence = within(flyout).getAllByTestId('codeIntelligenceCatalogEntryEvidence');
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toHaveTextContent('internal/proxy/handler.go:42');
    expect(evidence[0]).toHaveTextContent('logger.Error("upstream request failed", "err", err)');
    expect(within(flyout).getByRole('button', { name: 'Raw JSON' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('shows the empty message when no entries match', async () => {
    getCatalogMock.mockResolvedValue({ page: 1, perPage: 25, total: 0, items: [] });
    renderView();

    expect(await screen.findByTestId('codeIntelligenceCatalogEmpty')).toHaveTextContent(
      'No catalog entries match these filters.'
    );
    expect(screen.queryByTestId('codeIntelligenceCatalogRow')).toBeNull();
  });

  it('loads every repository by default and sends each selected filter value', async () => {
    getCatalogMock.mockResolvedValue({ page: 1, perPage: 25, total: 0, items: [] });
    renderView();
    await screen.findByTestId('codeIntelligenceCatalogEmpty');
    expect(getCatalogMock).toHaveBeenLastCalledWith(expect.anything(), {
      repositories: [],
      kinds: [],
      severities: [],
      sort: 'default',
      page: 1,
    });

    fireEvent.click(screen.getByTestId('codeIntelligence-repository-filter-button'));
    fireEvent.click(await screen.findByText('elastic/eis-gateway'));
    fireEvent.click(screen.getByText('open-telemetry/demo'));
    fireEvent.click(screen.getByTestId('codeIntelligence-severity-filter-button'));
    fireEvent.click(await screen.findByText('High'));
    fireEvent.click(screen.getByText('Critical'));

    await waitFor(() =>
      expect(getCatalogMock).toHaveBeenLastCalledWith(expect.anything(), {
        repositories: ['elastic/eis-gateway', 'open-telemetry/demo'],
        kinds: [],
        severities: ['high', 'critical'],
        sort: 'default',
        page: 1,
      })
    );
  });

  it('sorts by severity and returns to the first page', async () => {
    getCatalogMock.mockResolvedValue({ page: 1, perPage: 25, total: 0, items: [] });
    renderView();
    await screen.findByTestId('codeIntelligenceCatalogEmpty');

    const sort = screen.getByTestId('codeIntelligenceCatalogSort');
    expect(sort).toHaveDisplayValue('Recently updated');
    fireEvent.change(sort, { target: { value: 'severity_desc' } });

    await waitFor(() =>
      expect(getCatalogMock).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ sort: 'severity_desc', page: 1 })
      )
    );
  });

  it('opens pre-filtered to the repository and severity it was given', async () => {
    getCatalogMock.mockResolvedValue({ page: 1, perPage: 25, total: 0, items: [] });
    renderView({ initialRepositories: ['open-telemetry/demo'], initialSeverities: ['critical'] });
    await screen.findByTestId('codeIntelligenceCatalogEmpty');

    expect(getCatalogMock).toHaveBeenCalledTimes(1);
    expect(getCatalogMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ repositories: ['open-telemetry/demo'], severities: ['critical'] })
    );
  });
});

describe('severityForScore', () => {
  it.each([
    [0, 'low'],
    [39, 'low'],
    [40, 'medium'],
    [59, 'medium'],
    [60, 'high'],
    [79, 'high'],
    [80, 'critical'],
    [100, 'critical'],
    [undefined, undefined],
  ])('maps %s to %s', (score, severity) => {
    expect(severityForScore(score)).toBe(severity);
  });
});

describe('evidenceLanguage', () => {
  it.each([
    ['cmd/main.go', 'go'],
    ['src/app.tsx', 'typescript'],
    ['lib/index.JS', 'javascript'],
    ['service.py', 'python'],
    ['Main.kt', 'kotlin'],
    ['README', 'text'],
    ['config.yaml', 'text'],
    [undefined, 'text'],
  ])('maps %s to %s', (path, language) => {
    expect(evidenceLanguage(path)).toBe(language);
  });
});
