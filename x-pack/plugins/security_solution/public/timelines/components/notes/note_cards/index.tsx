/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel, EuiScreenReaderOnly } from '@elastic/eui';
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';

import { getNotesContainerClassName } from '@kbn/timelines-plugin/public';
import { AddNote } from '../add_note';
import { AssociateNote } from '../helpers';
import { NotePreviews, NotePreviewsContainer } from '../../open_timeline/note_previews';
import { TimelineResultNote } from '../../open_timeline/types';

import * as i18n from '../translations';

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

  &.euiPanel--plain {
    background-color: transparent;
  }
`;
NoteCardsCompContainer.displayName = 'NoteCardsCompContainer';

const NotesContainer = styled(EuiFlexGroup)`
  margin-bottom: 5px;
`;
NotesContainer.displayName = 'NotesContainer';

interface Props {
  ariaRowindex: number;
  associateNote: AssociateNote;
  notes: TimelineResultNote[];
  showAddNote: boolean;
  toggleShowAddNote: () => void;
}

/** A view for entering and reviewing notes */
export const NoteCards = React.memo<Props>(
  ({ ariaRowindex, associateNote, notes, showAddNote, toggleShowAddNote }) => {
    const [newNote, setNewNote] = useState('');

    const associateNoteAndToggleShow = useCallback(
      (noteId: string) => {
        associateNote(noteId);
        toggleShowAddNote();
      },
      [associateNote, toggleShowAddNote]
    );

    return (
      <NoteCardsCompContainer data-test-subj="note-cards" hasShadow={false} paddingSize="none">
        {notes.length ? (
          <NotePreviewsContainer data-test-subj="note-previews-container">
            <NotesContainer
              className={getNotesContainerClassName(ariaRowindex)}
              data-test-subj="notes"
              direction="column"
              gutterSize="none"
            >
              <EuiScreenReaderOnly data-test-subj="screenReaderOnly">
                <p>{i18n.YOU_ARE_VIEWING_NOTES(ariaRowindex)}</p>
              </EuiScreenReaderOnly>
              <NotePreviews notes={notes} />
            </NotesContainer>
          </NotePreviewsContainer>
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
