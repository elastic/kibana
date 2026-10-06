/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core/public';
import React from 'react';

import type { ExtractionBatchStatus, Repository } from './api';
import { deleteRepository, getBatch, getCatalogSummary, saveRepository, startBatch } from './api';
import { RepositoriesView } from './repositories_view';

jest.mock('./api', () => ({
  deleteRepository: jest.fn(),
  getBatch: jest.fn(),
  getCatalogSummary: jest.fn(),
  saveRepository: jest.fn(),
  startBatch: jest.fn(),
}));

const getCatalogSummaryMock = getCatalogSummary as jest.MockedFunction<typeof getCatalogSummary>;
const startBatchMock = startBatch as jest.MockedFunction<typeof startBatch>;
const getBatchMock = getBatch as jest.MockedFunction<typeof getBatch>;
const saveRepositoryMock = saveRepository as jest.MockedFunction<typeof saveRepository>;
const deleteRepositoryMock = deleteRepository as jest.MockedFunction<typeof deleteRepository>;

const repositoryRow = (repository: string, extra: Partial<Repository> = {}): Repository => ({
  repository,
  remoteUrl: `https://github.com/${repository}.git`,
  defaultRef: 'HEAD',
  enabled: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...extra,
});

const conflict = (attributes: Record<string, unknown>) =>
  Object.assign(new Error('Conflict'), {
    response: { status: 409 },
    body: {
      statusCode: 409,
      message: 'An extraction batch is already running.',
      attributes: { code: 'extraction_already_running', ...attributes },
    },
  });

const runningBatch: ExtractionBatchStatus = {
  id: 'running-id',
  status: 'running',
  startedAt: '2026-09-29T10:00:00.000Z',
  repositories: [
    {
      repository: 'elastic/one',
      revision: 'HEAD',
      status: 'running',
      counts: {},
      errors: [],
      warnings: [],
    },
    {
      repository: 'elastic/two',
      revision: 'main',
      status: 'pending',
      counts: {},
      errors: [],
      warnings: [],
    },
  ],
};

const renderView = (
  repositories = [
    repositoryRow('elastic/one'),
    repositoryRow('elastic/two', { defaultRef: 'main' }),
  ],
  reload = jest.fn()
) => {
  const onViewCatalog = jest.fn();
  render(
    <RepositoriesView
      http={{} as HttpSetup}
      repositories={repositories}
      loading={false}
      reload={reload}
      onViewCatalog={onViewCatalog}
    />
  );
  return { reload, onViewCatalog };
};

const runButton = () => screen.getByTestId('codeIntelligenceRunBatchButton');
const openAddFlyout = () =>
  fireEvent.click(screen.getByTestId('codeIntelligenceAddRepositoryButton'));

describe('RepositoriesView', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Pending, so tests that ignore the counts finish without a state update outside act().
    getCatalogSummaryMock.mockReturnValue(new Promise(() => {}));
  });

  it('does not show the remote URL column', () => {
    renderView();

    expect(screen.queryByRole('columnheader', { name: /Remote URL/ })).toBeNull();
    expect(screen.queryByText('https://github.com/elastic/one.git')).toBeNull();
  });

  it('does not show the In run all column', () => {
    renderView();

    expect(screen.queryByRole('columnheader', { name: /In run all/ })).toBeNull();
  });

  it('shows every severity count, including zero, and drills down into the catalog', async () => {
    getCatalogSummaryMock.mockResolvedValue([
      {
        repository: 'elastic/one',
        total: 11,
        severities: { low: 5, medium: 0, high: 4, critical: 2 },
      },
    ]);
    const { onViewCatalog } = renderView();

    const critical = await screen.findByTestId(
      'codeIntelligenceSeverityCount-elastic/one-critical'
    );
    expect(critical).toHaveTextContent(/^2$/);
    expect(critical).toHaveAttribute('title', 'Critical');
    expect(
      screen.getByTestId('codeIntelligenceSeverityCount-elastic/one-medium')
    ).toHaveTextContent(/^0$/);
    expect(screen.getByTestId('codeIntelligenceSeverityCount-elastic/one-low')).toHaveTextContent(
      /^5$/
    );
    expect(screen.getByTestId('codeIntelligenceSeverityCount-elastic/two-high')).toHaveTextContent(
      /^0$/
    );
    expect(screen.queryByTestId('codeIntelligenceViewCatalog-elastic/one')).toBeNull();
    expect(screen.queryByText(/\d+ entries/)).toBeNull();

    fireEvent.click(screen.getByTestId('codeIntelligenceSeverityCount-elastic/one-high'));
    expect(onViewCatalog).toHaveBeenLastCalledWith('elastic/one', 'high');
  });

  it('shows Completed with entries, Ready without, and Disabled when not enabled', async () => {
    getCatalogSummaryMock.mockResolvedValue([
      {
        repository: 'elastic/one',
        total: 3,
        severities: { low: 3, medium: 0, high: 0, critical: 0 },
      },
      {
        repository: 'elastic/off',
        total: 3,
        severities: { low: 3, medium: 0, high: 0, critical: 0 },
      },
    ]);
    renderView([
      repositoryRow('elastic/one'),
      repositoryRow('elastic/two'),
      repositoryRow('elastic/off', { enabled: false }),
    ]);

    await waitFor(() =>
      expect(screen.getByTestId('codeIntelligenceRepositoryStatus-elastic/one')).toHaveTextContent(
        'Completed'
      )
    );
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByTestId('codeIntelligenceRepositoryStatus-elastic/two')).toHaveTextContent(
      'Ready'
    );
    expect(screen.getByTestId('codeIntelligenceRepositoryStatus-elastic/off')).toHaveTextContent(
      'Disabled'
    );
  });

  it('does not guess Ready or Completed when the catalog counts cannot be loaded', async () => {
    getCatalogSummaryMock.mockRejectedValue(new Error('unavailable'));
    renderView([repositoryRow('elastic/one'), repositoryRow('elastic/off', { enabled: false })]);

    await waitFor(() => expect(getCatalogSummaryMock).toHaveBeenCalled());
    expect(screen.getByTestId('codeIntelligenceRepositoryStatus-elastic/one')).toHaveTextContent(
      /^—$/
    );
    expect(screen.getByTestId('codeIntelligenceRepositoryStatus-elastic/off')).toHaveTextContent(
      'Disabled'
    );
  });

  it('derives the status from the catalog once a batch finishes, without the revision', async () => {
    getCatalogSummaryMock.mockResolvedValue([
      {
        repository: 'elastic/two',
        total: 2,
        severities: { low: 2, medium: 0, high: 0, critical: 0 },
      },
    ]);
    startBatchMock.mockResolvedValue({ id: 'running-id' });
    getBatchMock.mockResolvedValue({
      ...runningBatch,
      status: 'completed',
      repositories: runningBatch.repositories.map((entry) => ({
        ...entry,
        status: 'completed',
        commitSha: '0123456789abcdef',
      })),
    });
    renderView();

    fireEvent.click(runButton());

    await waitFor(() => expect(getBatchMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId('codeIntelligenceRepositoryStatus-elastic/two')).toHaveTextContent(
        'Completed'
      )
    );
    expect(screen.getByTestId('codeIntelligenceRepositoryStatus-elastic/one')).toHaveTextContent(
      'Ready'
    );
    expect(screen.queryByText(/0123456789ab/)).toBeNull();
    expect(screen.getByTestId('codeIntelligenceRevision-elastic/two')).toHaveTextContent('main');
    expect(screen.getAllByText('main')).toHaveLength(1);
  });

  it('reloads the catalog counts when a batch finishes and again once writes are searchable', async () => {
    jest.useFakeTimers();
    try {
      getCatalogSummaryMock.mockResolvedValue([]);
      startBatchMock.mockResolvedValue({ id: 'running-id' });
      getBatchMock.mockResolvedValue({ ...runningBatch, status: 'completed' });
      renderView();
      await waitFor(() => expect(getCatalogSummaryMock).toHaveBeenCalledTimes(1));

      fireEvent.click(runButton());

      await waitFor(() => expect(getCatalogSummaryMock).toHaveBeenCalledTimes(2));
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      await waitFor(() => expect(getCatalogSummaryMock).toHaveBeenCalledTimes(3));
    } finally {
      jest.useRealTimers();
    }
  });

  it('runs every enabled repository when nothing is selected and shows per-repository status', async () => {
    startBatchMock.mockResolvedValue({ id: 'running-id' });
    getBatchMock.mockResolvedValue(runningBatch);
    renderView();

    expect(runButton()).toHaveTextContent('Run all enabled repositories');
    fireEvent.click(runButton());

    await waitFor(() =>
      expect(screen.getByTestId('codeIntelligenceRepositoryStatus-elastic/one')).toHaveTextContent(
        'Running'
      )
    );
    expect(screen.getByTestId('codeIntelligenceRepositoryStatus-elastic/two')).toHaveTextContent(
      'Waiting'
    );
    expect(startBatchMock).toHaveBeenCalledWith(expect.anything(), undefined);
    expect(screen.getByTestId('codeIntelligenceBatchStatus')).toHaveTextContent('Running');
  });

  it('runs only the selected repositories at their stored default refs', async () => {
    startBatchMock.mockResolvedValue({ id: 'running-id' });
    getBatchMock.mockResolvedValue(runningBatch);
    renderView();

    const revision = screen.getByTestId('codeIntelligenceRevision-elastic/two');
    expect(revision).toHaveTextContent('main');
    expect(revision.tagName).not.toBe('INPUT');
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByTestId('checkboxSelectRow-elastic/two'));
    expect(runButton()).toHaveTextContent('Run 1 selected repository');
    fireEvent.click(runButton());

    await waitFor(() =>
      expect(startBatchMock).toHaveBeenCalledWith(expect.anything(), [
        { repository: 'elastic/two' },
      ])
    );
  });

  it('opens an empty add flyout from the toolbar and closes it on cancel', () => {
    renderView();

    expect(screen.queryByTestId('codeIntelligenceRepositoryFlyout')).toBeNull();
    openAddFlyout();
    const flyout = screen.getByTestId('codeIntelligenceRepositoryFlyout');
    expect(within(flyout).getByRole('heading', { name: 'Add repository' })).toBeInTheDocument();
    expect(screen.getByTestId('codeIntelligenceRepositoryFormRepository')).toHaveValue('');
    expect(screen.getByTestId('codeIntelligenceRepositoryFormDefaultRef')).toHaveValue('HEAD');
    fireEvent.click(screen.getByTestId('codeIntelligenceRepositoryFormCancel'));

    expect(screen.queryByTestId('codeIntelligenceRepositoryFlyout')).toBeNull();
    expect(saveRepositoryMock).not.toHaveBeenCalled();
  });

  it('opens the same flyout pre-filled when a repository is edited', async () => {
    saveRepositoryMock.mockResolvedValue(repositoryRow('elastic/two', { defaultRef: 'v2.0' }));
    const { reload } = renderView();

    fireEvent.click(screen.getAllByTestId('codeIntelligenceEditRepository')[1]);
    const flyout = screen.getByTestId('codeIntelligenceRepositoryFlyout');
    expect(within(flyout).getByText('Enabled')).toBeInTheDocument();
    expect(within(flyout).queryByText(/running all/)).toBeNull();
    expect(within(flyout).getByRole('heading', { name: 'Edit elastic/two' })).toBeInTheDocument();
    expect(screen.getByTestId('codeIntelligenceRepositoryFormRepository')).toHaveValue(
      'elastic/two'
    );
    expect(screen.getByTestId('codeIntelligenceRepositoryFormRemoteUrl')).toHaveValue(
      'https://github.com/elastic/two.git'
    );
    const defaultRef = screen.getByTestId('codeIntelligenceRepositoryFormDefaultRef');
    expect(defaultRef).toHaveValue('main');
    fireEvent.change(defaultRef, { target: { value: 'v2.0' } });
    fireEvent.click(screen.getByTestId('codeIntelligenceRepositoryFormSave'));

    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(saveRepositoryMock).toHaveBeenCalledWith(expect.anything(), {
      repository: 'elastic/two',
      remoteUrl: 'https://github.com/elastic/two.git',
      defaultRef: 'v2.0',
      enabled: true,
    });
    expect(screen.queryByTestId('codeIntelligenceRepositoryFlyout')).toBeNull();
  });

  it('offers to add a repository when none are configured', () => {
    renderView([]);

    expect(screen.getByText('No repositories configured')).toBeInTheDocument();
    openAddFlyout();
    expect(screen.getByTestId('codeIntelligenceRepositoryFlyout')).toBeInTheDocument();
  });

  it('explains a running batch and attaches it when the user follows it', async () => {
    startBatchMock.mockRejectedValue(conflict({ extractionId: 'running-id' }));
    getBatchMock.mockResolvedValue(runningBatch);
    renderView();

    fireEvent.click(runButton());
    const callout = await screen.findByTestId('codeIntelligenceStartErrorCallout');
    expect(within(callout).getByText('An extraction batch is already running')).toBeInTheDocument();
    expect(within(callout).getAllByRole('listitem')).toHaveLength(4);
    fireEvent.click(within(callout).getByTestId('codeIntelligenceFollowRunButton'));

    await waitFor(() =>
      expect(screen.queryByTestId('codeIntelligenceStartErrorCallout')).toBeNull()
    );
    expect(getBatchMock).toHaveBeenCalledWith(expect.anything(), 'running-id');
    expect(screen.getByTestId('codeIntelligenceRepositoryStatus-elastic/one')).toHaveTextContent(
      'Running'
    );
  });

  it('does not offer to follow a batch another instance holds', async () => {
    startBatchMock.mockRejectedValue(conflict({}));
    renderView();

    fireEvent.click(runButton());

    const callout = await screen.findByTestId('codeIntelligenceStartErrorCallout');
    expect(within(callout).queryByTestId('codeIntelligenceFollowRunButton')).toBeNull();
  });

  it('saves a new repository through the form and reloads the list', async () => {
    saveRepositoryMock.mockResolvedValue(repositoryRow('elastic/three'));
    const { reload } = renderView();

    openAddFlyout();
    fireEvent.change(screen.getByTestId('codeIntelligenceRepositoryFormRepository'), {
      target: { value: 'elastic/three' },
    });
    fireEvent.change(screen.getByTestId('codeIntelligenceRepositoryFormRemoteUrl'), {
      target: { value: 'https://github.com/elastic/three.git' },
    });
    fireEvent.click(screen.getByTestId('codeIntelligenceRepositoryFormSave'));

    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(saveRepositoryMock).toHaveBeenCalledWith(expect.anything(), {
      repository: 'elastic/three',
      remoteUrl: 'https://github.com/elastic/three.git',
      defaultRef: 'HEAD',
      enabled: true,
    });
  });

  it('marks invalid fields without saving', async () => {
    renderView();
    openAddFlyout();

    fireEvent.change(screen.getByTestId('codeIntelligenceRepositoryFormRepository'), {
      target: { value: 'not a repository' },
    });
    fireEvent.change(screen.getByTestId('codeIntelligenceRepositoryFormRemoteUrl'), {
      target: { value: 'git@github.com:elastic/three.git' },
    });
    fireEvent.click(screen.getByTestId('codeIntelligenceRepositoryFormSave'));

    expect(await screen.findByText(/Use the form owner\/name/)).toBeInTheDocument();
    expect(screen.getByText(/Use an https:\/\/ URL/)).toBeInTheDocument();
    expect(saveRepositoryMock).not.toHaveBeenCalled();
  });

  it('saves once an invalid field is corrected', async () => {
    saveRepositoryMock.mockResolvedValue(repositoryRow('elastic/three'));
    renderView();
    openAddFlyout();
    const remoteUrl = screen.getByTestId('codeIntelligenceRepositoryFormRemoteUrl');

    fireEvent.change(screen.getByTestId('codeIntelligenceRepositoryFormRepository'), {
      target: { value: 'elastic/three' },
    });
    fireEvent.change(remoteUrl, { target: { value: 'git@github.com:elastic/three.git' } });
    fireEvent.click(screen.getByTestId('codeIntelligenceRepositoryFormSave'));
    await screen.findByText(/Use an https:\/\/ URL/);
    fireEvent.change(remoteUrl, { target: { value: 'https://github.com/elastic/three.git' } });
    fireEvent.click(screen.getByTestId('codeIntelligenceRepositoryFormSave'));

    expect(screen.getByTestId('codeIntelligenceRepositoryForm')).toHaveAttribute('novalidate');
    await waitFor(() => expect(saveRepositoryMock).toHaveBeenCalledTimes(1));
  });

  it('keeps the stored connector when a repository is edited', async () => {
    saveRepositoryMock.mockResolvedValue(repositoryRow('elastic/one'));
    renderView([repositoryRow('elastic/one', { githubConnectorId: 'connector' })]);

    fireEvent.click(screen.getByTestId('codeIntelligenceEditRepository'));
    expect(screen.getByTestId('codeIntelligenceRepositoryFormRepository')).toBeDisabled();
    fireEvent.click(screen.getByTestId('codeIntelligenceRepositoryFormEnabled'));
    fireEvent.click(screen.getByTestId('codeIntelligenceRepositoryFormSave'));

    await waitFor(() =>
      expect(saveRepositoryMock).toHaveBeenCalledWith(expect.anything(), {
        repository: 'elastic/one',
        remoteUrl: 'https://github.com/elastic/one.git',
        defaultRef: 'HEAD',
        enabled: false,
        githubConnectorId: 'connector',
      })
    );
  });

  it('deletes a repository only after confirmation', async () => {
    deleteRepositoryMock.mockResolvedValue({ deleted: true });
    const { reload } = renderView([repositoryRow('elastic/one')]);

    fireEvent.click(screen.getByTestId('codeIntelligenceDeleteRepository'));
    const modal = await screen.findByTestId('codeIntelligenceDeleteConfirmModal');
    expect(within(modal).getByText(/stay there/)).toBeInTheDocument();
    expect(deleteRepositoryMock).not.toHaveBeenCalled();
    fireEvent.click(within(modal).getByTestId('confirmModalConfirmButton'));

    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(deleteRepositoryMock).toHaveBeenCalledWith(expect.anything(), 'elastic/one');
  });
});
