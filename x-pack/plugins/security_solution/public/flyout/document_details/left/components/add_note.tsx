/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCheckbox,
  EuiComment,
  EuiCommentList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { TimelineId } from '../../../../../common/types';
import { timelineSelectors } from '../../../../timelines/store';
import { useIsTimelineFlyoutOpen } from '../../shared/hooks/use_is_timeline_flyout_open';
import {
  ADD_NOTE_BUTTON_TEST_ID,
  ADD_NOTE_MARKDOWN_TEST_ID,
  ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID,
} from './test_ids';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { State } from '../../../../common/store';
import {
  createNote,
  ReqStatus,
  selectCreateNoteError,
  selectCreateNoteStatus,
} from '../../../../notes/store/notes.slice';
import { MarkdownEditor } from '../../../../common/components/markdown_editor';

const timelineCheckBoxId = 'xpack.securitySolution.notes.attachToTimelineCheckboxId';

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
export const ATTACH_TO_TIMELINE_CHECKBOX = i18n.translate(
  'xpack.securitySolution.notes.attachToTimelineCheckboxLabel',
  {
    defaultMessage: 'Attach to active timeline',
  }
);
export const ATTACH_TO_TIMELINE_INFO = i18n.translate(
  'xpack.securitySolution.notes.attachToTimelineInfoLabel',
  {
    defaultMessage: 'The active timeline must be saved before a note can be associated with it',
  }
);

export interface AddNewNoteProps {
  /**
   * Id of the document
   */
  eventId: string;
}

/**
 * Renders a markdown editor and an add button to create new notes.
 * The checkbox is automatically checked if the flyout is opened from a timeline and that timeline is saved. It is disabled if the flyout is NOT opened from a timeline.
 */
export const AddNote = memo(({ eventId }: AddNewNoteProps) => {
  const dispatch = useDispatch();
  const { addError: addErrorToast } = useAppToasts();
  const [editorValue, setEditorValue] = useState('');
  const [isMarkdownInvalid, setIsMarkdownInvalid] = useState(false);

  const activeTimeline = useSelector((state: State) =>
    timelineSelectors.selectTimelineById(state, TimelineId.active)
  );

  // if the flyout is open from a timeline and that timeline is saved, we automatically check the checkbox to associate the note to it
  const isTimelineFlyout = useIsTimelineFlyoutOpen();
  const [checked, setChecked] = useState(isTimelineFlyout && activeTimeline.savedObjectId != null);
  const onCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setChecked(e.target.checked),
    []
  );

  const createStatus = useSelector((state: State) => selectCreateNoteStatus(state));
  const createError = useSelector((state: State) => selectCreateNoteError(state));

  const addNote = useCallback(() => {
    dispatch(
      createNote({
        note: {
          timelineId: (checked && activeTimeline?.savedObjectId) || '',
          eventId,
          note: editorValue,
        },
      })
    );
    setEditorValue('');
  }, [activeTimeline?.savedObjectId, checked, dispatch, editorValue, eventId]);

  // show a toast if the create note call fails
  useEffect(() => {
    if (createStatus === ReqStatus.Failed && createError) {
      addErrorToast(null, {
        title: CREATE_NOTE_ERROR,
      });
    }
  }, [addErrorToast, createError, createStatus]);

  const buttonDisabled = useMemo(
    () => editorValue.trim().length === 0 || isMarkdownInvalid,
    [editorValue, isMarkdownInvalid]
  );

  const checkBoxDisabled = useMemo(
    () => !isTimelineFlyout || (isTimelineFlyout && activeTimeline?.savedObjectId == null),
    [activeTimeline?.savedObjectId, isTimelineFlyout]
  );

  return (
    <>
      <EuiCommentList>
        <EuiComment username="">
          <MarkdownEditor
            dataTestSubj={ADD_NOTE_MARKDOWN_TEST_ID}
            value={editorValue}
            onChange={setEditorValue}
            ariaLabel={MARKDOWN_ARIA_LABEL}
            setIsMarkdownInvalid={setIsMarkdownInvalid}
          />
        </EuiComment>
      </EuiCommentList>
      <EuiSpacer />
      <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <>
            <EuiCheckbox
              data-test-subj={ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID}
              id={timelineCheckBoxId}
              label={
                <>
                  {ATTACH_TO_TIMELINE_CHECKBOX}
                  <EuiToolTip position="top" content={ATTACH_TO_TIMELINE_INFO}>
                    <EuiIcon
                      type="iInCircle"
                      css={css`
                        margin-left: 4px;
                      `}
                    />
                  </EuiToolTip>
                </>
              }
              disabled={checkBoxDisabled}
              checked={checked}
              onChange={(e) => onCheckboxChange(e)}
            />
          </>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={addNote}
            isLoading={createStatus === ReqStatus.Loading}
            disabled={buttonDisabled}
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
