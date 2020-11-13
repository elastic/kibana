/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { appActions } from '../../../../common/store/app';
import { Note } from '../../../../common/lib/note';
import { AssociateNote, updateAndAssociateNode, UpdateInternalNewNote } from '../helpers';
import * as i18n from '../translations';

import { NewNote } from './new_note';

const AddNotesContainer = styled(EuiFlexGroup)`
  margin-bottom: 5px;
  user-select: none;
`;

AddNotesContainer.displayName = 'AddNotesContainer';

const ButtonsContainer = styled(EuiFlexGroup)`
  margin-top: 5px;
`;

ButtonsContainer.displayName = 'ButtonsContainer';

export const CancelButton = React.memo<{ onCancelAddNote: () => void }>(({ onCancelAddNote }) => (
  <EuiButtonEmpty data-test-subj="cancel" onClick={onCancelAddNote}>
    {i18n.CANCEL}
  </EuiButtonEmpty>
));

CancelButton.displayName = 'CancelButton';

/** Displays an input for entering a new note, with an adjacent "Add" button */
export const AddNote = React.memo<{
  associateNote: AssociateNote;
  newNote: string;
  onCancelAddNote?: () => void;
  updateNewNote: UpdateInternalNewNote;
}>(({ associateNote, newNote, onCancelAddNote, updateNewNote }) => {
  const dispatch = useDispatch();

  const updateNote = useCallback((note: Note) => dispatch(appActions.updateNote({ note })), [
    dispatch,
  ]);

  const handleClick = useCallback(
    () =>
      updateAndAssociateNode({
        associateNote,
        newNote,
        updateNewNote,
        updateNote,
      }),
    [associateNote, newNote, updateNewNote, updateNote]
  );

  return (
    <AddNotesContainer alignItems="flexEnd" direction="column" gutterSize="none">
      <NewNote note={newNote} noteInputHeight={200} updateNewNote={updateNewNote} />
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
            onClick={handleClick}
          >
            {i18n.ADD_NOTE}
          </EuiButton>
        </EuiFlexItem>
      </ButtonsContainer>
    </AddNotesContainer>
  );
});

AddNote.displayName = 'AddNote';
