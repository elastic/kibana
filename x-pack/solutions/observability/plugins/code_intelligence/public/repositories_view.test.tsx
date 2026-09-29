/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core/public';
import React from 'react';

import type { ExtractionStatus } from './api';
import { getExtraction, startExtraction } from './api';
import { RepositoriesView } from './repositories_view';

jest.mock('./api', () => ({ getExtraction: jest.fn(), startExtraction: jest.fn() }));

const startExtractionMock = startExtraction as jest.MockedFunction<typeof startExtraction>;
const getExtractionMock = getExtraction as jest.MockedFunction<typeof getExtraction>;

const repository = 'elastic/example';

const conflict = (attributes: Record<string, unknown>) =>
  Object.assign(new Error('Conflict'), {
    response: { status: 409 },
    body: {
      statusCode: 409,
      message: 'An extraction for elastic/example is already running.',
      attributes: { code: 'extraction_already_running', repository, ...attributes },
    },
  });

const runningStatus: ExtractionStatus = {
  id: 'running-id',
  repository,
  revision: 'HEAD',
  status: 'running',
  counts: {},
  errors: [],
  warnings: [],
  startedAt: '2026-09-29T10:00:00.000Z',
};

const renderView = () =>
  render(
    <RepositoriesView
      http={{} as HttpSetup}
      repositories={[{ repository }]}
      loading={false}
      reload={jest.fn()}
    />
  );

const clickRun = () => fireEvent.click(screen.getByRole('button', { name: 'Run extraction' }));

describe('RepositoriesView start errors', () => {
  beforeEach(() => {
    startExtractionMock.mockReset();
    getExtractionMock.mockReset();
  });

  it('shows what went wrong, why, and what to do when the repository is already running', async () => {
    startExtractionMock.mockRejectedValue(conflict({}));
    renderView();

    clickRun();

    const callout = await screen.findByTestId('codeIntelligenceStartErrorCallout');
    expect(
      within(callout).getByText('An extraction for elastic/example is already running')
    ).toBeInTheDocument();
    expect(within(callout).getByText(/Only one extraction per repository/)).toBeInTheDocument();
    expect(within(callout).getAllByRole('listitem')).toHaveLength(4);
    expect(within(callout).queryByTestId('codeIntelligenceFollowRunButton')).toBeNull();
  });

  it('attaches the running extraction to the row when the user follows it', async () => {
    startExtractionMock.mockRejectedValue(conflict({ extractionId: 'running-id' }));
    getExtractionMock.mockResolvedValue(runningStatus);
    renderView();

    clickRun();
    fireEvent.click(await screen.findByTestId('codeIntelligenceFollowRunButton'));

    await waitFor(() =>
      expect(screen.queryByTestId('codeIntelligenceStartErrorCallout')).toBeNull()
    );
    expect(getExtractionMock).toHaveBeenCalledWith(expect.anything(), 'running-id');
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('keeps the suggestions but drops the follow action when the run cannot be fetched', async () => {
    startExtractionMock.mockRejectedValue(conflict({ extractionId: 'running-id' }));
    getExtractionMock.mockRejectedValue(new Error('Not Found'));
    renderView();

    clickRun();
    fireEvent.click(await screen.findByTestId('codeIntelligenceFollowRunButton'));

    await waitFor(() => expect(screen.queryByTestId('codeIntelligenceFollowRunButton')).toBeNull());
    const callout = screen.getByTestId('codeIntelligenceStartErrorCallout');
    expect(within(callout).getAllByRole('listitem')).toHaveLength(4);
  });
});
