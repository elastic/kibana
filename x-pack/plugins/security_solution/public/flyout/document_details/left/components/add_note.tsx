/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiComment,
  EuiCommentList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { ADD_NOTE_BUTTON_TEST_ID, ADD_NOTE_MARKDOWN_TEST_ID } from './test_ids';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { State } from '../../../../common/store';
import {
  createNote,
  ReqStatus,
  selectCreateNoteError,
  selectCreateNoteStatus,
} from '../../../../notes/store/notes.slice';
import { MarkdownEditor } from '../../../../common/components/markdown_editor';

export const MARKDOWN_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.notes.markdownAriaLabel',
  {
    defaultMessage: 'Note',
  }
);
export const ADD_NOTE_BUTTON = i18n.translate('xpack.securitySolution.notes.addNoteBtnLabel', {
  defaultMessage: 'Add note',
});
export const CREATE_NOTE_ERROR = i18n.translate(
  'xpack.securitySolution.notes.createNoteErrorLabel',
  {
    defaultMessage: 'Error create note',
  }
);

export interface AddNewNoteProps {
  /**
   * Id of the document
   */
  eventId: string;
}

/**
 * Renders a markdown editor and a add button to create new notes
 */
export const AddNote = memo(({ eventId }: AddNewNoteProps) => {
  const dispatch = useDispatch();
  const { addError: addErrorToast } = useAppToasts();
  const [editorValue, setEditorValue] = useState('');

  const createStatus = useSelector((state: State) => selectCreateNoteStatus(state));
  const createError = useSelector((state: State) => selectCreateNoteError(state));

  const addNote = useCallback(() => {
    dispatch(
      createNote({
        note: {
          timelineId: '',
          eventId,
          note: editorValue,
        },
      })
    );
    setEditorValue('');
  }, [dispatch, editorValue, eventId]);

  useEffect(() => {
    if (createStatus === ReqStatus.Failed && createError) {
      addErrorToast(null, {
        title: CREATE_NOTE_ERROR,
      });
    }
  }, [addErrorToast, createError, createStatus]);

  return (
    <>
      <EuiCommentList>
        <EuiComment username="">
          <MarkdownEditor
            dataTestSubj={ADD_NOTE_MARKDOWN_TEST_ID}
            value={editorValue}
            onChange={setEditorValue}
            ariaLabel={MARKDOWN_ARIA_LABEL}
            setIsMarkdownInvalid={() => {}}
          />
        </EuiComment>
      </EuiCommentList>
      <EuiSpacer />
      <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={addNote}
            isLoading={createStatus === ReqStatus.Loading}
            data-test-subj={ADD_NOTE_BUTTON_TEST_ID}
          >
            {ADD_NOTE_BUTTON}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

AddNote.displayName = 'AddNote';
