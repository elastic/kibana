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
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { Note } from '../../../common/lib/note';

import { AddNote } from './add_note';
import { columns } from './columns';
import { AssociateNote, NotesCount, search } from './helpers';
import { TimelineStatusLiteral, TimelineStatus } from '../../../../common/types/timeline';
import { timelineActions } from '../../store/timeline';
import { appSelectors } from '../../../common/store/app';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';

interface Props {
  associateNote: AssociateNote;
  noteIds: string[];
  status: TimelineStatusLiteral;
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
export const Notes = React.memo<Props>(({ associateNote, noteIds, status }) => {
  const getNotesByIds = appSelectors.notesByIdsSelector();
  const [newNote, setNewNote] = useState('');
  const isImmutable = status === TimelineStatus.immutable;

  const notesById = useDeepEqualSelector(getNotesByIds);

  const items = useMemo(() => appSelectors.getNotes(notesById, noteIds), [notesById, noteIds]);

  return (
    <>
      <EuiModalHeader>
        <NotesCount noteIds={noteIds} />
      </EuiModalHeader>

      <EuiModalBody>
        {!isImmutable && (
          <AddNote associateNote={associateNote} newNote={newNote} updateNewNote={setNewNote} />
        )}
        <EuiSpacer size="s" />
        <InMemoryTable
          data-test-subj="notes-table"
          items={items}
          columns={columns}
          search={search}
          sorting={true}
        />
      </EuiModalBody>
    </>
  );
});

Notes.displayName = 'Notes';

interface NotesTabContentPros {
  noteIds: string[];
  timelineId: string;
  timelineStatus: TimelineStatusLiteral;
}

/** A view for entering and reviewing notes */
export const NotesTabContent = React.memo<NotesTabContentPros>(
  ({ noteIds, timelineStatus, timelineId }) => {
    const dispatch = useDispatch();
    const getNotesByIds = appSelectors.notesByIdsSelector();
    const [newNote, setNewNote] = useState('');
    const isImmutable = timelineStatus === TimelineStatus.immutable;
    const notesById = useDeepEqualSelector(getNotesByIds);

    const items = useMemo(() => appSelectors.getNotes(notesById, noteIds), [notesById, noteIds]);

    const associateNote = useCallback(
      (noteId: string) => dispatch(timelineActions.addNote({ id: timelineId, noteId })),
      [dispatch, timelineId]
    );

    return (
      <>
        <InMemoryTable
          data-test-subj="notes-table"
          items={items}
          columns={columns}
          search={search}
          sorting={true}
        />
        {!isImmutable && (
          <AddNote associateNote={associateNote} newNote={newNote} updateNewNote={setNewNote} />
        )}
        <EuiSpacer size="s" />
      </>
    );
  }
);

NotesTabContent.displayName = 'NotesTabContent';
