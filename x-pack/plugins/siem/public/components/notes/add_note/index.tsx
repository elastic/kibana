/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { MarkdownHint } from '../../markdown/markdown_hint';
import {
  AssociateNote,
  GetNewNoteId,
  updateAndAssociateNode,
  UpdateInternalNewNote,
  UpdateNote,
} from '../helpers';
import * as i18n from '../translations';

import { NewNote } from './new_note';

const AddNotesContainer = styled(EuiFlexGroup)`
  margin-bottom: 5px;
  user-select: none;
`;

const ButtonsContainer = styled(EuiFlexGroup)`
  margin-top: 5px;
`;

export const CancelButton = pure<{ onCancelAddNote: () => void }>(({ onCancelAddNote }) => (
  <EuiButtonEmpty data-test-subj="cancel" onClick={onCancelAddNote}>
    {i18n.CANCEL}
  </EuiButtonEmpty>
));

/** Displays an input for entering a new note, with an adjacent "Add" button */
export const AddNote = pure<{
  associateNote: AssociateNote;
  getNewNoteId: GetNewNoteId;
  newNote: string;
  onCancelAddNote?: () => void;
  updateNewNote: UpdateInternalNewNote;
  updateNote: UpdateNote;
}>(({ associateNote, getNewNoteId, newNote, onCancelAddNote, updateNewNote, updateNote }) => (
  <AddNotesContainer alignItems="flexEnd" direction="column" gutterSize="none">
    <NewNote note={newNote} noteInputHeight={200} updateNewNote={updateNewNote} />
    <EuiFlexItem grow={true}>
      <MarkdownHint show={newNote.trim().length > 0} />
    </EuiFlexItem>
    <ButtonsContainer gutterSize="none">
      {onCancelAddNote != null ? (
        <EuiFlexItem grow={false}>
          <CancelButton onCancelAddNote={onCancelAddNote} />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="add-note"
          isDisabled={newNote.trim().length === 0}
          fill={true}
          onClick={() =>
            updateAndAssociateNode({
              associateNote,
              getNewNoteId,
              newNote,
              updateNewNote,
              updateNote,
            })
          }
        >
          {i18n.ADD_NOTE}
        </EuiButton>
      </EuiFlexItem>
    </ButtonsContainer>
  </AddNotesContainer>
));
