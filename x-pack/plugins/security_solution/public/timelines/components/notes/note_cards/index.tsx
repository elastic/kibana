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
import { NotePreviews } from '../../open_timeline/note_previews';
import { TimelineResultNote } from '../../open_timeline/types';

const AddNoteContainer = styled.div``;
AddNoteContainer.displayName = 'AddNoteContainer';

const NoteContainer = styled.div`
  margin-top: 5px;
`;
NoteContainer.displayName = 'NoteContainer';

const NoteCardsCompContainer = styled(EuiPanel)`
  border: none;
  background-color: transparent;
  box-shadow: none;
`;
NoteCardsCompContainer.displayName = 'NoteCardsCompContainer';

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
    const [newNote, setNewNote] = useState('');

    const associateNoteAndToggleShow = useCallback(
      (noteId: string) => {
        associateNote(noteId);
        toggleShowAddNote();
      },
      [associateNote, toggleShowAddNote]
    );

    const notes: TimelineResultNote[] = useMemo(
      () =>
        appSelectors.getNotes(notesById, noteIds).map((note) => ({
          savedObjectId: note.saveObjectId,
          note: note.note,
          noteId: note.id,
          updated: (note.lastEdit ?? note.created).getTime(),
          updatedBy: note.user,
        })),
      [notesById, noteIds]
    );

    return (
      <NoteCardsCompContainer data-test-subj="note-cards" hasShadow={false} paddingSize="none">
        {notes.length ? (
          <NotesContainer data-test-subj="notes" direction="column" gutterSize="none">
            <NotePreviews notes={notes} />
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
      </NoteCardsCompContainer>
    );
  }
);

NoteCards.displayName = 'NoteCards';
