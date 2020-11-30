/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { appSelectors } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { AddNote } from '../add_note';
import { AssociateNote } from '../helpers';
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
const NoteCardsCompContainer = styled(EuiPanel)`
  border: none;
  background-color: transparent;
  box-shadow: none;
`;
NoteCardsCompContainer.displayName = 'NoteCardsCompContainer';

const NoteCardsComp = React.memo<NoteCardsCompProps>(({ children }) => (
  <NoteCardsCompContainer data-test-subj="note-cards" hasShadow={false} paddingSize="none">
    {children}
  </NoteCardsCompContainer>
));
NoteCardsComp.displayName = 'NoteCardsComp';

const NotesContainer = styled(EuiFlexGroup)`
  margin-bottom: 5px;
`;
NotesContainer.displayName = 'NotesContainer';

interface Props {
  associateNote: AssociateNote;
  noteIds: string[];
  showAddNote: boolean;
  toggleShowAddNote: () => void;
}

/** A view for entering and reviewing notes */
export const NoteCards = React.memo<Props>(
  ({ associateNote, noteIds, showAddNote, toggleShowAddNote }) => {
    const getNotesByIds = useMemo(() => appSelectors.notesByIdsSelector(), []);
    const notesById = useDeepEqualSelector(getNotesByIds);
    const items = useMemo(() => appSelectors.getNotes(notesById, noteIds), [notesById, noteIds]);
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
            {items.map((note) => (
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
              newNote={newNote}
              onCancelAddNote={toggleShowAddNote}
              updateNewNote={setNewNote}
            />
          </AddNoteContainer>
        ) : null}
      </NoteCardsComp>
    );
  }
);

NoteCards.displayName = 'NoteCards';
