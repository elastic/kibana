/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiTextArea, EuiTitle, EuiToolTip } from '@elastic/eui';
import moment from 'moment';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { Note } from '../../lib/note';
import * as i18n from './translations';

/** Performs IO to update (or add a new) note */
export type UpdateNote = (note: Note) => void;
/** Performs IO to associate a note with an (opaque to the caller) thing  */
export type AssociateNote = (noteId: string) => void;
/** Performs IO to get a new note ID */
export type GetNewNoteId = () => string;
/** Updates the local state containing a new note being edited by the user */
export type UpdateInternalNewNote = (newNote: string) => void;
/** Closes the notes popover */
export type OnClosePopover = () => void;

/**
 * Defines the behavior of the search input that appears above the table of data
 */
export const search = {
  box: {
    incremental: true,
    placeholder: 'Filter by User or Note...',
    schema: {
      user: {
        type: 'string',
      },
      note: {
        type: 'string',
      },
    },
  },
};

const AddNotesContainer = styled.div`
  align-items: flex-end;
  display: flex;
  flex-direction: column;
  margin-bottom: 25px;
  user-select: none;
`;

/** Displays a count of the existing notes */
export const NotesCount = pure<{
  notes: Note[];
}>(({ notes }) => (
  <EuiTitle size="s">
    <h3>{notes.length} Notes</h3>
  </EuiTitle>
));

const TextArea = styled(EuiTextArea)`
  margin-bottom: 5px;
`;

/** An input for entering a new note  */
export const NewNote = pure<{
  note: string;
  updateNewNote: UpdateInternalNewNote;
}>(({ note, updateNewNote }) => (
  <TextArea
    autoFocus
    aria-label={i18n.ADD_A_NOTE}
    data-test-subj="add-a-note"
    fullWidth={true}
    onChange={e => updateNewNote(e.target.value)}
    placeholder={i18n.ADD_A_NOTE}
    spellCheck={true}
    value={note}
  />
));

/** Creates a new instance of a `note` */
export const createNote = ({
  newNote,
  getNewNoteId,
}: {
  newNote: string;
  getNewNoteId: GetNewNoteId;
}): Note => ({
  created: moment.utc().toDate(),
  id: getNewNoteId(),
  lastEdit: null,
  note: newNote.trim(),
  user: 'admin', // TODO: get the logged-in Kibana user
});

interface UpdateAndAssociateNodeParams {
  associateNote: AssociateNote;
  getNewNoteId: GetNewNoteId;
  newNote: string;
  updateNewNote: UpdateInternalNewNote;
  updateNote: UpdateNote;
}

export const updateAndAssociateNode = ({
  associateNote,
  getNewNoteId,
  newNote,
  updateNewNote,
  updateNote,
}: UpdateAndAssociateNodeParams) => {
  const note = createNote({ newNote, getNewNoteId });
  updateNote(note); // perform IO to store the newly-created note
  associateNote(note.id); // associate the note with the (opaque) thing
  updateNewNote(''); // clear the input
};

/** Displays an input for entering a new note, with an adjacent "Add" button */
export const AddNote = pure<{
  associateNote: AssociateNote;
  getNewNoteId: GetNewNoteId;
  newNote: string;
  updateNewNote: UpdateInternalNewNote;
  updateNote: UpdateNote;
}>(({ associateNote, getNewNoteId, newNote, updateNewNote, updateNote }) => (
  <AddNotesContainer>
    <NewNote note={newNote} updateNewNote={updateNewNote} />
    <EuiToolTip data-test-subj="add-tool-tip" content={i18n.ADD_A_NEW_NOTE}>
      <EuiButton
        data-test-subj="Add Note"
        isDisabled={newNote.trim().length < 1}
        fill={true}
        onClick={() =>
          updateAndAssociateNode({
            getNewNoteId,
            newNote,
            updateNote,
            associateNote,
            updateNewNote,
          })
        }
      >
        {i18n.ADD_NOTE}
      </EuiButton>
    </EuiToolTip>
  </AddNotesContainer>
));

/**
 * An item rendered in the table
 */
export interface Item {
  created: Date;
  user: string;
  note: string;
}

export const getItems = (notes: Note[]): Item[] =>
  notes.map(note => ({
    created: note.created,
    user: note.user,
    note: note.note,
  }));
