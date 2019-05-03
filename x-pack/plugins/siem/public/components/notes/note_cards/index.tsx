/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { Note } from '../../../lib/note';
import { AddNote } from '../add_note';
import { AssociateNote, GetNewNoteId, UpdateNote } from '../helpers';
import { NoteCard } from '../note_card';

const AddNoteContainer = styled.div``;

const NoteContainer = styled.div`
  margin-top: 5px;
`;

const NoteCardsContainer = styled(EuiPanel)<{ width?: string }>`
  border: none;
  width: ${({ width = '100%' }) => width};
`;

const NotesContainer = styled(EuiFlexGroup)`
  padding: 0 5px;
  margin-bottom: 5px;
`;

interface Props {
  associateNote: AssociateNote;
  getNotesByIds: (noteIds: string[]) => Note[];
  getNewNoteId: GetNewNoteId;
  noteIds: string[];
  showAddNote: boolean;
  toggleShowAddNote: () => void;
  updateNote: UpdateNote;
  width?: string;
}

interface State {
  newNote: string;
}

/** A view for entering and reviewing notes */
export class NoteCards extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { newNote: '' };
  }

  public render() {
    const {
      getNotesByIds,
      getNewNoteId,
      noteIds,
      showAddNote,
      toggleShowAddNote,
      updateNote,
      width,
    } = this.props;

    return (
      <NoteCardsContainer
        data-test-subj="note-cards"
        hasShadow={false}
        paddingSize="none"
        width={width}
      >
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
              associateNote={this.associateNoteAndToggleShow}
              getNewNoteId={getNewNoteId}
              newNote={this.state.newNote}
              onCancelAddNote={toggleShowAddNote}
              updateNewNote={this.updateNewNote}
              updateNote={updateNote}
            />
          </AddNoteContainer>
        ) : null}
      </NoteCardsContainer>
    );
  }

  private associateNoteAndToggleShow = (noteId: string) => {
    this.props.associateNote(noteId);
    this.props.toggleShowAddNote();
  };

  private updateNewNote = (newNote: string): void => {
    this.setState({ newNote });
  };
}
