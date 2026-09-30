/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core/public';
import React from 'react';

import type { ExtractionBatchStatus, Repository } from './api';
import { deleteRepository, getBatch, saveRepository, startBatch } from './api';
import { RepositoriesView } from './repositories_view';

jest.mock('./api', () => ({
  deleteRepository: jest.fn(),
  getBatch: jest.fn(),
  saveRepository: jest.fn(),
  startBatch: jest.fn(),
}));

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
  render(
    <RepositoriesView
      http={{} as HttpSetup}
      repositories={repositories}
      loading={false}
      reload={reload}
    />
  );
  return { reload };
};

const runButton = () => screen.getByTestId('codeIntelligenceRunBatchButton');

describe('RepositoriesView', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('runs every enabled repository when nothing is selected and shows per-repository status', async () => {
    startBatchMock.mockResolvedValue({ id: 'running-id' });
    getBatchMock.mockResolvedValue(runningBatch);
    renderView();

    expect(runButton()).toHaveTextContent('Run all enabled repositories');
    fireEvent.click(runButton());

    expect(
      await screen.findByTestId('codeIntelligenceRepositoryStatus-elastic/one')
    ).toHaveTextContent('Running');
    expect(screen.getByTestId('codeIntelligenceRepositoryStatus-elastic/two')).toHaveTextContent(
      'Waiting'
    );
    expect(startBatchMock).toHaveBeenCalledWith(expect.anything(), undefined);
    expect(screen.getByTestId('codeIntelligenceBatchStatus')).toHaveTextContent('Running');
  });

  it('runs only the selected repositories at the revisions entered for this run', async () => {
    startBatchMock.mockResolvedValue({ id: 'running-id' });
    getBatchMock.mockResolvedValue(runningBatch);
    renderView();

    fireEvent.click(screen.getByTestId('checkboxSelectRow-elastic/two'));
    fireEvent.change(screen.getByTestId('codeIntelligenceRevision-elastic/two'), {
      target: { value: 'v1.0' },
    });
    expect(runButton()).toHaveTextContent('Run 1 selected repository');
    fireEvent.click(runButton());

    await waitFor(() =>
      expect(startBatchMock).toHaveBeenCalledWith(expect.anything(), [
        { repository: 'elastic/two', revision: 'v1.0' },
      ])
    );
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
