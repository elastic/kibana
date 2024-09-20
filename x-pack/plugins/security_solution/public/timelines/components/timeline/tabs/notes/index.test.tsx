/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import NotesTabContentComponent, { FETCH_NOTES_ERROR, NO_NOTES } from '.';
import { render } from '@testing-library/react';
import { createMockStore, mockGlobalState, TestProviders } from '../../../../../common/mock';
import { ReqStatus } from '../../../../../notes';
import { NOTES_LOADING_TEST_ID } from '../../../../../notes/components/test_ids';
import React from 'react';
import { TimelineId } from '../../../../../../common/types';

jest.mock('../../../../../common/hooks/use_experimental_features');

const mockAddError = jest.fn();
jest.mock('../../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addError: mockAddError,
  }),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

const timelineId = TimelineId.test;

describe('NotesTabContentComponent', () => {
  it('should show the old note system', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <NotesTabContentComponent timelineId={timelineId} />
      </TestProviders>
    );

    expect(getByTestId('old-notes-screen')).toBeInTheDocument();
    expect(queryByTestId('new-notes-screen')).not.toBeInTheDocument();
  });

  it('should show the new note system', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <NotesTabContentComponent timelineId={timelineId} />
      </TestProviders>
    );

    expect(getByTestId('new-notes-screen')).toBeInTheDocument();
    expect(queryByTestId('old-notes-screen')).not.toBeInTheDocument();
  });

  it('should fetch notes for the document id', () => {
    render(
      <TestProviders>
        <NotesTabContentComponent timelineId={timelineId} />
      </TestProviders>
    );
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should render loading spinner if notes are being fetched', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesBySavedObjectIds: ReqStatus.Loading,
        },
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <NotesTabContentComponent timelineId={timelineId} />
      </TestProviders>
    );

    expect(getByTestId(NOTES_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render no data message if no notes are present', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesBySavedObjectIds: ReqStatus.Succeeded,
        },
      },
    });

    const { getByText } = render(
      <TestProviders store={store}>
        <NotesTabContentComponent timelineId={timelineId} />
      </TestProviders>
    );

    expect(getByText(NO_NOTES)).toBeInTheDocument();
  });

  it('should render error toast if fetching notes fails', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesBySavedObjectIds: ReqStatus.Failed,
        },
        error: {
          ...mockGlobalState.notes.error,
          fetchNotesBySavedObjectIds: { type: 'http', status: 500 },
        },
      },
    });

    render(
      <TestProviders store={store}>
        <NotesTabContentComponent timelineId={timelineId} />
      </TestProviders>
    );

    expect(mockAddError).toHaveBeenCalledWith(null, {
      title: FETCH_NOTES_ERROR,
    });
  });
});
