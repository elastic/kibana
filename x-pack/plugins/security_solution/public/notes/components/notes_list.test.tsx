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
  OPEN_TIMELINE_BUTTON_TEST_ID,
} from './test_ids';
import { createMockStore, mockGlobalState, TestProviders } from '../../common/mock';
import { NotesList } from './notes_list';
import { ReqStatus } from '../store/notes.slice';
import { useUserPrivileges } from '../../common/components/user_privileges';
import type { Note } from '../../../common/api/timeline';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

jest.mock('../../common/hooks/use_experimental_features');

jest.mock('../../common/components/user_privileges');
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

const mockNote: Note = {
  eventId: '1',
  noteId: '1',
  note: 'note-1',
  timelineId: 'timeline-1',
  created: 1663882629000,
  createdBy: 'elastic',
  updated: 1663882629000,
  updatedBy: 'elastic',
  version: 'version',
};
const mockOptions = { hideTimelineIcon: true };

describe('NotesList', () => {
  beforeEach(() => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);

    useUserPrivilegesMock.mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true, read: true },
    });
  });

  it('should render a note as a comment', () => {
    const { getByTestId, getByText } = render(
      <TestProviders>
        <NotesList notes={[mockNote]} />
      </TestProviders>
    );

    expect(getByTestId(`${NOTES_COMMENT_TEST_ID}-0`)).toBeInTheDocument();
    expect(getByText('note-1')).toBeInTheDocument();
    expect(getByTestId(`${DELETE_NOTE_BUTTON_TEST_ID}-0`)).toBeInTheDocument();
    expect(getByTestId(`${OPEN_TIMELINE_BUTTON_TEST_ID}-0`)).toBeInTheDocument();
    expect(getByTestId(`${NOTE_AVATAR_TEST_ID}-0`)).toBeInTheDocument();
  });

  it('should render ? in avatar is user is missing', () => {
    const customMockNotes = [
      {
        ...mockNote,
        updatedBy: undefined,
      },
    ];

    const { getByTestId } = render(
      <TestProviders>
        <NotesList notes={customMockNotes} />
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
        <NotesList notes={[mockNote]} />
      </TestProviders>
    );

    expect(getByTestId(ADD_NOTE_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should not render a delete icon when the user does not have crud privileges', () => {
    useUserPrivilegesMock.mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: false, read: true },
    });
    const { queryByTestId } = render(
      <TestProviders>
        <NotesList notes={[mockNote]} />
      </TestProviders>
    );

    const deleteIcon = queryByTestId(`${DELETE_NOTE_BUTTON_TEST_ID}-0`);

    expect(deleteIcon).not.toBeInTheDocument();
  });

  it('should not render timeline icon if no timeline is related to the note', () => {
    const customMockNotes = [
      {
        ...mockNote,
        timelineId: '',
      },
    ];

    const { queryByTestId } = render(
      <TestProviders>
        <NotesList notes={customMockNotes} />
      </TestProviders>
    );

    expect(queryByTestId(`${OPEN_TIMELINE_BUTTON_TEST_ID}-0`)).not.toBeInTheDocument();
  });

  it('should not render timeline icon if it should be hidden', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <NotesList notes={[mockNote]} options={mockOptions} />
      </TestProviders>
    );

    expect(queryByTestId(`${OPEN_TIMELINE_BUTTON_TEST_ID}-0`)).not.toBeInTheDocument();
  });
});
