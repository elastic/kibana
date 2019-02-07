/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiHorizontalRule,
  // @ts-ignore
  EuiInMemoryTable,
  EuiPanel,
} from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { Note } from '../../lib/note';
import { columns } from './columns';
import {
  AddNote,
  AssociateNote,
  getItems,
  GetNewNoteId,
  NotesCount,
  search,
  UpdateNote,
} from './helpers';

interface Props {
  associateNote: AssociateNote;
  getNotesByIds: (noteIds: string[]) => Note[];
  getNewNoteId: GetNewNoteId;
  noteIds: string[];
  updateNote: UpdateNote;
}

interface State {
  newNote: string;
}

const NotesPanel = styled(EuiPanel)`
  height: 600px;
  max-height: 600px;
  width: 750px;
`;

const NotesContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const InMemoryTable = styled(EuiInMemoryTable)`
  overflow-x: hidden;
  overflow-y: auto;
  height: 220px;
`;

//   max-height: 220px;

/** A view for entering and reviewing notes */
export class Notes extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { newNote: '' };
  }

  public render() {
    const { associateNote, getNotesByIds, getNewNoteId, noteIds, updateNote } = this.props;

    return (
      <NotesPanel>
        <NotesContainer>
          <NotesCount noteIds={noteIds} />
          <EuiHorizontalRule margin="m" />
          <AddNote
            associateNote={associateNote}
            getNewNoteId={getNewNoteId}
            newNote={this.state.newNote}
            updateNewNote={this.updateNewNote}
            updateNote={updateNote}
          />
          <InMemoryTable
            data-test-subj="notes-table"
            items={getItems(noteIds, getNotesByIds)}
            columns={columns}
            pagination={false}
            search={search}
            sorting={true}
          />
        </NotesContainer>
      </NotesPanel>
    );
  }

  private updateNewNote = (newNote: string): void => {
    this.setState({ newNote });
  };
}
