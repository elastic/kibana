/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiCopy, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { Message } from '@kbn/elastic-assistant';
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { useAssistantContext } from '@kbn/elastic-assistant/impl/assistant_context';
import { useKibana, useToasts } from '../../common/lib/kibana';
import type { Note } from '../../common/lib/note';
import { appActions } from '../../common/store/actions';
import { TimelineId } from '../../../common/types';
import { updateAndAssociateNode } from '../../timelines/components/notes/helpers';
import { timelineActions } from '../../timelines/store/timeline';
import * as i18n from './translations';

interface Props {
  message: Message;
}

const CommentActionsComponent: React.FC<Props> = ({ message }) => {
  const toasts = useToasts();
  const { cases } = useKibana().services;
  const dispatch = useDispatch();

  const { showAssistantOverlay } = useAssistantContext();

  const associateNote = useCallback(
    (noteId: string) => dispatch(timelineActions.addNote({ id: TimelineId.active, noteId })),
    [dispatch]
  );

  const updateNote = useCallback(
    (note: Note) => dispatch(appActions.updateNote({ note })),
    [dispatch]
  );

  const onAddNoteToTimeline = useCallback(() => {
    updateAndAssociateNode({
      associateNote,
      newNote: message.content,
      updateNewNote: () => {},
      updateNote,
      user: '', // TODO: attribute assistant messages
    });

    toasts.addSuccess(i18n.ADDED_NOTE_TO_TIMELINE);
  }, [associateNote, message.content, toasts, updateNote]);

  // Attach to case support
  const selectCaseModal = cases.hooks.useCasesAddToExistingCaseModal({
    onClose: () => {},
    onSuccess: () => {},
  });

  const onAddToExistingCase = useCallback(() => {
    showAssistantOverlay({ showOverlay: false });

    selectCaseModal.open({
      getAttachments: () => [
        {
          comment: message.content,
          type: AttachmentType.user,
          owner: i18n.ELASTIC_AI_ASSISTANT,
        },
      ],
    });
  }, [message.content, selectCaseModal, showAssistantOverlay]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiToolTip position="top" content={i18n.ADD_NOTE_TO_TIMELINE}>
          <EuiButtonIcon
            aria-label={i18n.ADD_MESSAGE_CONTENT_AS_TIMELINE_NOTE}
            color="primary"
            iconType="editorComment"
            onClick={onAddNoteToTimeline}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip position="top" content={i18n.ADD_TO_CASE_EXISTING_CASE}>
          <EuiButtonIcon
            aria-label={i18n.ADD_TO_CASE_EXISTING_CASE}
            color="primary"
            iconType="addDataApp"
            onClick={onAddToExistingCase}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip position="top" content={i18n.COPY_TO_CLIPBOARD}>
          <EuiCopy textToCopy={message.content}>
            {(copy) => (
              <EuiButtonIcon
                aria-label={i18n.COPY_TO_CLIPBOARD}
                color="primary"
                iconType="copyClipboard"
                onClick={copy}
              />
            )}
          </EuiCopy>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const CommentActions = React.memo(CommentActionsComponent);
