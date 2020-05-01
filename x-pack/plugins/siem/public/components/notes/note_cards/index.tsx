/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';

import { Note } from '../../../lib/note';
import { AddNote } from '../add_note';
import { AssociateNote, GetNewNoteId, UpdateNote } from '../helpers';
import { NoteCard } from '../note_card';

const AddNoteContainer = styled.div``;
AddNoteContainer.displayName = 'AddNoteContainer';

const NoteContainer = styled.div`
  margin-top: 5px;
`;
NoteContainer.displayName = 'NoteContainer';

interface NoteCardsCompProps {
  children: React.ReactNode;
}

const NoteCardsComp = React.memo<NoteCardsCompProps>(({ children }) => (
  <EuiPanel
    data-test-subj="note-cards"
    hasShadow={false}
    paddingSize="none"
    style={{ border: 'none' }}
  >
    {children}
  </EuiPanel>
));
NoteCardsComp.displayName = 'NoteCardsComp';

const NotesContainer = styled(EuiFlexGroup)`
  padding: 0 5px;
  margin-bottom: 5px;
`;
NotesContainer.displayName = 'NotesContainer';

interface Props {
  associateNote: AssociateNote;
  getNotesByIds: (noteIds: string[]) => Note[];
  getNewNoteId: GetNewNoteId;
  noteIds: string[];
  showAddNote: boolean;
  toggleShowAddNote: () => void;
  updateNote: UpdateNote;
}

/** A view for entering and reviewing notes */
export const NoteCards = React.memo<Props>(
  ({
    associateNote,
    getNotesByIds,
    getNewNoteId,
    noteIds,
    showAddNote,
    toggleShowAddNote,
    updateNote,
  }) => {
    const [newNote, setNewNote] = useState('');

    const associateNoteAndToggleShow = useCallback(
      (noteId: string) => {
        associateNote(noteId);
        toggleShowAddNote();
      },
      [associateNote, toggleShowAddNote]
    );

    return (
      <NoteCardsComp>
        {noteIds.length ? (
          <NotesContainer data-test-subj="notes" direction="column" gutterSize="none">
            {getNotesByIds(noteIds).map(note => (
              <NoteContainer data-test-subj="note-container" key={note.id}>
                <NoteCard created={note.created} rawNote={note.note} user={note.user} />
              </NoteContainer>
            ))}
          </NotesContainer>
        ) : null}

        {showAddNote ? (
          <AddNoteContainer data-test-subj="add-note-container">
            <AddNote
              associateNote={associateNoteAndToggleShow}
              getNewNoteId={getNewNoteId}
              newNote={newNote}
              onCancelAddNote={toggleShowAddNote}
              updateNewNote={setNewNote}
              updateNote={updateNote}
            />
          </AddNoteContainer>
        ) : null}
      </NoteCardsComp>
    );
  }
);

NoteCards.displayName = 'NoteCards';
