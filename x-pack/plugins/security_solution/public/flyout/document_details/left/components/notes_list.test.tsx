/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, within } from '@testing-library/react';
import React from 'react';
import {
  ADD_NOTE_LOADING_TEST_ID,
  DELETE_NOTE_BUTTON_TEST_ID,
  NOTE_AVATAR_TEST_ID,
  NOTES_COMMENT_TEST_ID,
  NOTES_LOADING_TEST_ID,
  OPEN_TIMELINE_BUTTON_TEST_ID,
} from './test_ids';
import { createMockStore, mockGlobalState, TestProviders } from '../../../../common/mock';
import { DELETE_NOTE_ERROR, FETCH_NOTES_ERROR, NO_NOTES, NotesList } from './notes_list';
import { ReqStatus } from '../../../../notes/store/notes.slice';
import { useQueryTimelineById } from '../../../../timelines/components/open_timeline/helpers';

jest.mock('../../../../timelines/components/open_timeline/helpers');

const mockAddError = jest.fn();
jest.mock('../../../../common/hooks/use_app_toasts', () => ({
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

const renderNotesList = () =>
  render(
    <TestProviders>
      <NotesList eventId={'1'} />
    </TestProviders>
  );

describe('NotesList', () => {
  it('should render a note as a comment', () => {
    const { getByTestId, getByText } = renderNotesList();
    expect(getByTestId(`${NOTES_COMMENT_TEST_ID}-0`)).toBeInTheDocument();
    expect(getByText('note-1')).toBeInTheDocument();
    expect(getByTestId(`${DELETE_NOTE_BUTTON_TEST_ID}-0`)).toBeInTheDocument();
    expect(getByTestId(`${OPEN_TIMELINE_BUTTON_TEST_ID}-0`)).toBeInTheDocument();
    expect(getByTestId(`${NOTE_AVATAR_TEST_ID}-0`)).toBeInTheDocument();
  });

  it('should render loading spinner if notes are being fetched', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          fetchNotesByDocumentIds: ReqStatus.Loading,
        },
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <NotesList eventId={'1'} />
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
          fetchNotesByDocumentIds: ReqStatus.Succeeded,
        },
      },
    });

    const { getByText } = render(
      <TestProviders store={store}>
        <NotesList eventId={'wrong-event-id'} />
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
          fetchNotesByDocumentIds: ReqStatus.Failed,
        },
        error: {
          ...mockGlobalState.notes.error,
          fetchNotesByDocumentIds: { type: 'http', status: 500 },
        },
      },
    });

    render(
      <TestProviders store={store}>
        <NotesList eventId={'1'} />
      </TestProviders>
    );

    expect(mockAddError).toHaveBeenCalledWith(null, {
      title: FETCH_NOTES_ERROR,
    });
  });

  it('should render ? in avatar is user is missing', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        entities: {
          '1': {
            eventId: '1',
            noteId: '1',
            note: 'note-1',
            timelineId: '',
            created: 1663882629000,
            createdBy: 'elastic',
            updated: 1663882629000,
            updatedBy: null,
            version: 'version',
          },
        },
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <NotesList eventId={'1'} />
      </TestProviders>
    );
    const { getByText } = within(getByTestId(`${NOTE_AVATAR_TEST_ID}-0`));

    expect(getByText('?')).toBeInTheDocument();
  });

  it('should render create loading when user creates a new note', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          createNote: ReqStatus.Loading,
        },
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <NotesList eventId={'1'} />
      </TestProviders>
    );

    expect(getByTestId(ADD_NOTE_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should dispatch delete action when user deletes a new note', () => {
    const { getByTestId } = renderNotesList();

    const deleteIcon = getByTestId(`${DELETE_NOTE_BUTTON_TEST_ID}-0`);

    expect(deleteIcon).toBeInTheDocument();
    expect(deleteIcon).not.toHaveAttribute('disabled');

    deleteIcon.click();

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should have delete icons disabled and show spinner if a new note is being deleted', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          deleteNotes: ReqStatus.Loading,
        },
      },
    });

    const { getByTestId } = render(
      <TestProviders store={store}>
        <NotesList eventId={'1'} />
      </TestProviders>
    );

    expect(getByTestId(`${DELETE_NOTE_BUTTON_TEST_ID}-0`)).toHaveAttribute('disabled');
  });

  it('should render error toast if deleting a note fails', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        status: {
          ...mockGlobalState.notes.status,
          deleteNotes: ReqStatus.Failed,
        },
        error: {
          ...mockGlobalState.notes.error,
          deleteNotes: { type: 'http', status: 500 },
        },
      },
    });

    render(
      <TestProviders store={store}>
        <NotesList eventId={'1'} />
      </TestProviders>
    );

    expect(mockAddError).toHaveBeenCalledWith(null, {
      title: DELETE_NOTE_ERROR,
    });
  });

  it('should open timeline if user clicks on the icon', () => {
    const queryTimelineById = jest.fn();
    (useQueryTimelineById as jest.Mock).mockReturnValue(queryTimelineById);

    const { getByTestId } = renderNotesList();

    getByTestId(`${OPEN_TIMELINE_BUTTON_TEST_ID}-0`).click();

    expect(queryTimelineById).toHaveBeenCalledWith({
      duplicate: false,
      onOpenTimeline: undefined,
      timelineId: 'timeline-1',
      timelineType: undefined,
      unifiedComponentsInTimelineDisabled: false,
    });
  });

  it('should not render timeline icon if no timeline is related to the note', () => {
    const store = createMockStore({
      ...mockGlobalState,
      notes: {
        ...mockGlobalState.notes,
        entities: {
          '1': {
            eventId: '1',
            noteId: '1',
            note: 'note-1',
            timelineId: '',
            created: 1663882629000,
            createdBy: 'elastic',
            updated: 1663882629000,
            updatedBy: 'elastic',
            version: 'version',
          },
        },
      },
    });

    const { queryByTestId } = render(
      <TestProviders store={store}>
        <NotesList eventId={'1'} />
      </TestProviders>
    );

    expect(queryByTestId(`${OPEN_TIMELINE_BUTTON_TEST_ID}-0`)).not.toBeInTheDocument();
  });
});
