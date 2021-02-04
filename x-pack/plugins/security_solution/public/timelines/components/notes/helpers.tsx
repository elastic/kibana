/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import styled from 'styled-components';
import uuid from 'uuid';

import { Note } from '../../../common/lib/note';

import * as i18n from './translations';
import { CountBadge } from '../../../common/components/page';

/** Performs IO to update (or add a new) note */
export type UpdateNote = (note: Note) => void;
/** Performs IO to associate a note with something (e.g. a timeline, an event, etc). (The "something" is opaque to the caller) */
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
    placeholder: i18n.SEARCH_PLACEHOLDER,
    schema: {
      fields: {
        user: 'string',
        note: 'string',
      },
    },
  },
};

const TitleText = styled.h3`
  margin: 0 5px;
  cursor: default;
  user-select: none;
`;

TitleText.displayName = 'TitleText';

/** Displays a count of the existing notes */
export const NotesCount = React.memo<{
  noteIds: string[];
}>(({ noteIds }) => (
  <EuiFlexGroup alignItems="center" gutterSize="none">
    <EuiFlexItem grow={false}>
      <EuiIcon color="text" size="l" type="editorComment" />
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiTitle size="s">
        <TitleText>{i18n.NOTES}</TitleText>
      </EuiTitle>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <CountBadge color="hollow">{noteIds.length}</CountBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
));

NotesCount.displayName = 'NotesCount';

/** Creates a new instance of a `note` */
export const createNote = ({ newNote }: { newNote: string }): Note => ({
  created: moment.utc().toDate(),
  id: uuid.v4(),
  lastEdit: null,
  note: newNote.trim(),
  saveObjectId: null,
  user: 'elastic', // TODO: get the logged-in Kibana user
  version: null,
});

interface UpdateAndAssociateNodeParams {
  associateNote: AssociateNote;
  newNote: string;
  updateNewNote: UpdateInternalNewNote;
  updateNote: UpdateNote;
}

export const updateAndAssociateNode = ({
  associateNote,
  newNote,
  updateNewNote,
  updateNote,
}: UpdateAndAssociateNodeParams) => {
  const note = createNote({ newNote });
  updateNote(note); // perform IO to store the newly-created note
  associateNote(note.id); // associate the note with the (opaque) thing
  updateNewNote(''); // clear the input
};
