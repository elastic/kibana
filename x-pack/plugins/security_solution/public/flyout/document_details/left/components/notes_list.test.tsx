/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { NOTES_COMMENT_TEST_ID, NOTES_LOADING_TEST_ID } from './test_ids';
import { createMockStore, mockGlobalState, TestProviders } from '../../../../common/mock';
import { FETCH_NOTES_ERROR, NO_NOTES, NotesList } from './notes_list';
import { ReqStatus } from '../../../../notes/store/notes.slice';

const mockAddError = jest.fn();
jest.mock('../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addError: mockAddError,
  }),
}));

const renderNotesList = () =>
  render(
    <TestProviders>
      <NotesList eventId={'event-id'} />
    </TestProviders>
  );

describe('NotesList', () => {
  it('should render a note as a comment', () => {
    const { getByTestId, getByText } = renderNotesList();
    expect(getByTestId(`${NOTES_COMMENT_TEST_ID}-0`)).toBeInTheDocument();
    expect(getByText('note-1')).toBeInTheDocument();
  });

  it('should render loading spinner if notes are being fetched', () => {
    const state = { ...mockGlobalState };
    state.notes.status.fetchNotesByDocumentId = ReqStatus.Loading;
    const store = createMockStore(state);

    const { getByTestId } = render(
      <TestProviders store={store}>
        <NotesList eventId={'event-id'} />
      </TestProviders>
    );

    expect(getByTestId(NOTES_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render no data message if no notes are present', () => {
    const state = { ...mockGlobalState };
    state.notes.status.fetchNotesByDocumentId = ReqStatus.Succeeded;
    const store = createMockStore(state);

    const { getByText } = render(
      <TestProviders store={store}>
        <NotesList eventId={'wrong-event-id'} />
      </TestProviders>
    );

    expect(getByText(NO_NOTES)).toBeInTheDocument();
  });

  it('should render error toast if fetching notes fails', () => {
    const state = { ...mockGlobalState };
    state.notes.status.fetchNotesByDocumentId = ReqStatus.Failed;
    state.notes.error.fetchNotesByDocumentId = { type: 'http', status: 500 };
    const store = createMockStore(state);

    render(
      <TestProviders store={store}>
        <NotesList eventId={'event-id'} />
      </TestProviders>
    );

    expect(mockAddError).toHaveBeenCalledWith(null, {
      title: FETCH_NOTES_ERROR,
    });
  });
});
