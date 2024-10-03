/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { DELETE_NOTE_ERROR, DeleteNoteButtonIcon } from './delete_note_button';
import { createMockStore, mockGlobalState, TestProviders } from '../../common/mock';
import type { Note } from '../../../common/api/timeline';
import { DELETE_NOTE_BUTTON_TEST_ID } from './test_ids';
import { ReqStatus } from '..';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

const mockAddError = jest.fn();
jest.mock('../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addError: mockAddError,
  }),
}));

const note: Note = {
  eventId: '1',
  noteId: '1',
  note: 'note-1',
  timelineId: 'timelineId',
  created: 1663882629000,
  createdBy: 'elastic',
  updated: 1663882629000,
  updatedBy: 'elastic',
  version: 'version',
};
const index = 0;

describe('DeleteNoteButtonIcon', () => {
  it('should render the delete icon', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DeleteNoteButtonIcon note={note} index={index} />
      </TestProviders>
    );

    expect(getByTestId(`${DELETE_NOTE_BUTTON_TEST_ID}-${index}`)).toBeInTheDocument();
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
        <DeleteNoteButtonIcon note={note} index={index} />
      </TestProviders>
    );

    expect(getByTestId(`${DELETE_NOTE_BUTTON_TEST_ID}-0`)).toHaveAttribute('disabled');
  });

  it('should dispatch delete action when user deletes a new note', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DeleteNoteButtonIcon note={note} index={index} />
      </TestProviders>
    );

    const deleteIcon = getByTestId(`${DELETE_NOTE_BUTTON_TEST_ID}-0`);

    expect(deleteIcon).toBeInTheDocument();
    expect(deleteIcon).not.toHaveAttribute('disabled');

    deleteIcon.click();

    expect(mockDispatch).toHaveBeenCalled();
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
        <DeleteNoteButtonIcon note={note} index={index} />
      </TestProviders>
    );

    expect(mockAddError).toHaveBeenCalledWith(null, {
      title: DELETE_NOTE_ERROR,
    });
  });
});
