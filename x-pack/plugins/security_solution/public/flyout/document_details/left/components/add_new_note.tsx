/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiButton,
  EuiCheckbox,
  EuiComment,
  EuiCommentList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { TimelineId } from '../../../../../common/types';
import { useIsTimelineFlyoutOpen } from '../../shared/hooks/use_is_timeline_flyout_open';
import { useCurrentUser } from '../../../../common/lib/kibana';
import { appActions } from '../../../../common/store/app';
import { timelineSelectors } from '../../../../timelines/store';
import { MarkdownEditor } from '../../../../common/components/markdown_editor';

export interface AddNewNoteProps {
  /**
   *
   */
  eventId: string;
}

/**
 *
 */
export const AddNewNote = memo(({ eventId }: AddNewNoteProps) => {
  const dispatch = useDispatch();
  const authenticatedUser = useCurrentUser();
  const [editorValue, setEditorValue] = useState('');
  const isTimelineFlyout = useIsTimelineFlyoutOpen();
  const [checked, setChecked] = useState(isTimelineFlyout);

  const activeTimeline = useSelector((state) =>
    timelineSelectors.selectTimelineById(state, TimelineId.active)
  );

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(e.target.checked);
  };

  const addNote = useCallback(() => {
    if (checked) {
      dispatch(
        appActions.createNoteForDocumentAndTimelineRequest({
          documentId: eventId,
          savedObjectId: activeTimeline.id,
          note: {
            timelineId: activeTimeline.id,
            eventId,
            note: editorValue,
            created: new Date().getTime(),
            createdBy: authenticatedUser?.username,
            updated: null,
            updatedBy: null,
          },
        })
      );
    } else {
      dispatch(
        appActions.createNoteForDocumentRequest({
          documentId: eventId,
          note: {
            timelineId: '',
            eventId,
            note: editorValue,
            created: new Date().getTime(),
            createdBy: authenticatedUser?.username,
            updated: null,
            updatedBy: null,
          },
        })
      );
    }
    setEditorValue('');
  }, [activeTimeline.id, authenticatedUser?.username, checked, dispatch, editorValue, eventId]);

  return (
    <>
      <EuiCommentList>
        <EuiComment username="">
          <MarkdownEditor
            value={editorValue}
            onChange={setEditorValue}
            ariaLabel={'add new note'}
            setIsMarkdownInvalid={() => {}}
          />
        </EuiComment>
      </EuiCommentList>
      <EuiSpacer />
      <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id={'linkToTimeline'}
            label="Attach to timeline"
            disabled={!isTimelineFlyout}
            checked={checked}
            onChange={(e) => onChange(e)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={addNote} isLoading={false} isDisabled={false}>
            Add note
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

AddNewNote.displayName = 'AddNewNote';
