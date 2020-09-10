/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiModalBody,
  EuiModalHeader,
  EuiSpacer,
} from '@elastic/eui';
import React, { useState } from 'react';
import styled from 'styled-components';

import { Note } from '../../../common/lib/note';

import { AddNote } from './add_note';
import { columns } from './columns';
import { AssociateNote, GetNewNoteId, NotesCount, search, UpdateNote } from './helpers';
import { TimelineStatusLiteral, TimelineStatus } from '../../../../common/types/timeline';

interface Props {
  associateNote: AssociateNote;
  getNotesByIds: (noteIds: string[]) => Note[];
  getNewNoteId: GetNewNoteId;
  noteIds: string[];
  status: TimelineStatusLiteral;
  updateNote: UpdateNote;
}

const InMemoryTable: typeof EuiInMemoryTable & { displayName: string } = styled(
  EuiInMemoryTable as React.ComponentType<EuiInMemoryTableProps<Note>>
)`
  & thead {
    display: none;
  }
` as any; // eslint-disable-line @typescript-eslint/no-explicit-any

InMemoryTable.displayName = 'InMemoryTable';

/** A view for entering and reviewing notes */
export const Notes = React.memo<Props>(
  ({ associateNote, getNotesByIds, getNewNoteId, noteIds, status, updateNote }) => {
    const [newNote, setNewNote] = useState('');
    const isImmutable = status === TimelineStatus.immutable;

    return (
      <>
        <EuiModalHeader>
          <NotesCount noteIds={noteIds} />
        </EuiModalHeader>

        <EuiModalBody>
          {!isImmutable && (
            <AddNote
              associateNote={associateNote}
              getNewNoteId={getNewNoteId}
              newNote={newNote}
              updateNewNote={setNewNote}
              updateNote={updateNote}
            />
          )}
          <EuiSpacer size="s" />
          <InMemoryTable
            data-test-subj="notes-table"
            items={getNotesByIds(noteIds)}
            columns={columns}
            search={search}
            sorting={true}
          />
        </EuiModalBody>
      </>
    );
  }
);

Notes.displayName = 'Notes';
