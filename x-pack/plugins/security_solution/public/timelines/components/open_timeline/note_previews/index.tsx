/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash/fp';
import {
  EuiAvatar,
  EuiButtonIcon,
  EuiCommentList,
  EuiScreenReaderOnly,
  EuiText,
  EuiConfirmModal,
} from '@elastic/eui';
import type { EuiConfirmModalProps } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import type { TimelineResultNote } from '../types';
import { getEmptyValue, defaultToEmptyTag } from '../../../../common/components/empty_value';
import { MarkdownRenderer } from '../../../../common/components/markdown_editor';
import { timelineActions, timelineSelectors } from '../../../store';
import { NOTE_CONTENT_CLASS_NAME } from '../../timeline/body/helpers';
import * as i18n from './translations';
import { TimelineTabs, TimelineId } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useDeleteNote } from './hooks/use_delete_note';
import { getTimelineNoteSelector } from '../../timeline/notes_tab_content/selectors';

export const NotePreviewsContainer = styled.section`
  padding-top: ${({ theme }) => `${theme.eui.euiSizeS}`};
`;

NotePreviewsContainer.displayName = 'NotePreviewsContainer';

interface ToggleEventDetailsButtonProps {
  eventId: string;
  timelineId: string;
}

const ToggleEventDetailsButtonComponent: React.FC<ToggleEventDetailsButtonProps> = ({
  eventId,
  timelineId,
}) => {
  const dispatch = useDispatch();
  const { selectedPatterns } = useSourcererDataView(SourcererScopeName.timeline);

  const handleClick = useCallback(() => {
    dispatch(
      timelineActions.toggleDetailPanel({
        panelView: 'eventDetail',
        tabType: TimelineTabs.notes,
        id: timelineId,
        params: {
          eventId,
          indexName: selectedPatterns.join(','),
        },
      })
    );
  }, [dispatch, eventId, selectedPatterns, timelineId]);

  return (
    <EuiButtonIcon
      title={i18n.TOGGLE_EXPAND_EVENT_DETAILS}
      aria-label={i18n.TOGGLE_EXPAND_EVENT_DETAILS}
      color="text"
      iconType="arrowRight"
      onClick={handleClick}
    />
  );
};

const ToggleEventDetailsButton = React.memo(ToggleEventDetailsButtonComponent);

const DeleteNoteConfirm = React.memo<{
  closeModal: EuiConfirmModalProps['onCancel'];
  confirmModal: EuiConfirmModalProps['onConfirm'];
}>(({ closeModal, confirmModal }) => {
  return (
    <EuiConfirmModal
      title={i18n.DELETE_NOTE_CONFIRM}
      onCancel={closeModal}
      onConfirm={confirmModal}
      cancelButtonText={i18n.CANCEL_DELETE_NOTE}
      confirmButtonText={i18n.DELETE_NOTE}
      buttonColor="danger"
      defaultFocusedButton="confirm"
    />
  );
});

DeleteNoteConfirm.displayName = 'DeleteNoteConfirm';

const DeleteNoteButton = React.memo<{
  noteId?: string | null;
  eventId?: string | null;
  confirmingNoteId?: string | null;
  savedObjectId?: string | null;
  timelineId?: string;
  eventIdToNoteIds?: Record<string, string[]>;
}>(({ noteId, eventId, confirmingNoteId, timelineId, eventIdToNoteIds, savedObjectId }) => {
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  const { mutate, isLoading } = useDeleteNote(noteId, eventId, eventIdToNoteIds, savedObjectId);

  const handleOpenDeleteModal = useCallback(() => {
    setShowModal(true);
    dispatch(
      timelineActions.setConfirmingNoteId({
        confirmingNoteId: noteId,
        id: timelineId ?? TimelineId.active,
      })
    );
  }, [noteId, dispatch, timelineId]);

  const handleCancelDelete = useCallback(() => {
    setShowModal(false);
    dispatch(
      timelineActions.setConfirmingNoteId({
        confirmingNoteId: null,
        id: timelineId ?? TimelineId.active,
      })
    );
  }, [dispatch, timelineId]);

  const handleConfirmDelete = useCallback(() => {
    mutate(savedObjectId);
    setShowModal(false);
    dispatch(
      timelineActions.setConfirmingNoteId({
        confirmingNoteId: null,
        id: timelineId ?? TimelineId.active,
      })
    );
  }, [mutate, savedObjectId, dispatch, timelineId]);

  const disableDelete = useMemo(() => {
    return isLoading || savedObjectId == null;
  }, [isLoading, savedObjectId]);
  return (
    <>
      <EuiButtonIcon
        title={i18n.DELETE_NOTE}
        aria-label={i18n.DELETE_NOTE}
        data-test-subj={'delete-note'}
        color="text"
        iconType="trash"
        onClick={handleOpenDeleteModal}
        disabled={disableDelete}
      />
      {confirmingNoteId === noteId && showModal ? (
        <DeleteNoteConfirm closeModal={handleCancelDelete} confirmModal={handleConfirmDelete} />
      ) : null}
    </>
  );
});

DeleteNoteButton.displayName = 'DeleteNoteButton';

const NoteActions = React.memo<{
  eventId: string | null;
  timelineId?: string;
  noteId?: string | null;
  savedObjectId?: string | null;
  confirmingNoteId?: string | null;
  eventIdToNoteIds?: Record<string, string[]>;
}>(({ eventId, timelineId, noteId, confirmingNoteId, eventIdToNoteIds, savedObjectId }) => {
  return eventId && timelineId ? (
    <>
      <ToggleEventDetailsButton eventId={eventId} timelineId={timelineId} />
      <DeleteNoteButton
        noteId={noteId}
        eventId={eventId}
        confirmingNoteId={confirmingNoteId}
        savedObjectId={savedObjectId}
        timelineId={timelineId}
        eventIdToNoteIds={eventIdToNoteIds}
      />
    </>
  ) : (
    <DeleteNoteButton
      noteId={noteId}
      eventId={eventId}
      confirmingNoteId={confirmingNoteId}
      savedObjectId={savedObjectId}
      timelineId={timelineId}
      eventIdToNoteIds={eventIdToNoteIds}
    />
  );
});

NoteActions.displayName = 'NoteActions';
/**
 * Renders a preview of a note in the All / Open Timelines table
 */

interface NotePreviewsProps {
  notes?: TimelineResultNote[] | null;
  timelineId?: string;
  showTimelineDescription?: boolean;
}

export const NotePreviews = React.memo<NotePreviewsProps>(
  ({ notes, timelineId, showTimelineDescription }) => {
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const getTimelineNotes = useMemo(() => getTimelineNoteSelector(), []);
    const timeline = useDeepEqualSelector((state) =>
      getTimeline(state, timelineId ?? TimelineId.active)
    );
    const timelineNotes = useDeepEqualSelector((state) =>
      getTimelineNotes(state, timelineId ?? TimelineId.active)
    );
    const eventIdToNoteIds = timelineNotes?.eventIdToNoteIds;
    const descriptionList = useMemo(
      () =>
        showTimelineDescription && timelineId && timeline?.description
          ? [
              {
                username: defaultToEmptyTag(timeline.updatedBy),
                event: i18n.ADDED_A_DESCRIPTION,
                'data-test-subj': 'note-preview-description',
                id: 'note-preview-description',
                timestamp: timeline.updated ? (
                  <FormattedRelative data-test-subj="updated" value={new Date(timeline.updated)} />
                ) : (
                  getEmptyValue()
                ),
                children: <EuiText size="s">{timeline.description}</EuiText>,
                timelineAvatar: (
                  <EuiAvatar
                    data-test-subj="avatar"
                    name={timeline.updatedBy != null ? timeline.updatedBy : '?'}
                    size="l"
                  />
                ),
                actions: null,
              },
            ]
          : [],
      [timeline, timelineId, showTimelineDescription]
    );

    const notesList = useMemo(
      () =>
        uniqBy('savedObjectId', notes).map((note) => {
          const eventId =
            eventIdToNoteIds != null
              ? Object.entries<string[]>(eventIdToNoteIds).reduce<string | null>(
                  (acc, [id, noteIds]) => (noteIds.includes(note.noteId ?? '') ? id : acc),
                  null
                )
              : note.eventId ?? null;
          return {
            'data-test-subj': `note-preview-${note.savedObjectId}`,
            username: defaultToEmptyTag(note.updatedBy),
            event: i18n.ADDED_A_NOTE,
            timestamp: note.updated ? (
              <FormattedRelative data-test-subj="updated" value={new Date(note.updated)} />
            ) : (
              getEmptyValue()
            ),
            children: (
              <div className={NOTE_CONTENT_CLASS_NAME} tabIndex={0}>
                <EuiScreenReaderOnly data-test-subj="screenReaderOnlyUserAddedANote">
                  <p>{`${note.updatedBy ?? i18n.AN_UNKNOWN_USER} ${i18n.ADDED_A_NOTE}`}</p>
                </EuiScreenReaderOnly>
                <MarkdownRenderer>{note.note ?? ''}</MarkdownRenderer>
              </div>
            ),
            actions: (
              <NoteActions
                eventId={eventId}
                timelineId={timelineId}
                noteId={note.noteId}
                savedObjectId={note.savedObjectId}
                confirmingNoteId={timeline?.confirmingNoteId}
                eventIdToNoteIds={eventIdToNoteIds}
              />
            ),
            timelineAvatar: (
              <EuiAvatar
                data-test-subj="avatar"
                name={note.updatedBy != null ? note.updatedBy : '?'}
                size="l"
              />
            ),
          };
        }),
      [eventIdToNoteIds, notes, timelineId, timeline?.confirmingNoteId]
    );

    const commentList = useMemo(
      () => [...descriptionList, ...notesList],
      [descriptionList, notesList]
    );

    return <EuiCommentList data-test-subj="note-comment-list" comments={commentList} />;
  }
);

NotePreviews.displayName = 'NotePreviews';
