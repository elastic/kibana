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
import { useQuery } from '@tanstack/react-query';

import type { TimelineResultNote } from '../types';
import { getEmptyValue, defaultToEmptyTag } from '../../../../common/components/empty_value';
import { MarkdownRenderer } from '../../../../common/components/markdown_editor';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { appActions } from '../../../../common/store/app';
import { NOTE_CONTENT_CLASS_NAME } from '../../timeline/body/helpers';
import * as i18n from './translations';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { SaveTimelineButton } from '../../timeline/header/save_timeline_button';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useKibana } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

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
      title="Delete timeline note?"
      onCancel={closeModal}
      onConfirm={confirmModal}
      cancelButtonText="Keep note"
      confirmButtonText="Delete note"
      buttonColor="danger"
      defaultFocusedButton="confirm"
    />
  );
});

DeleteNoteConfirm.displayName = 'DeleteNoteConfirm';

function useDeleteNote(noteId: string | null | undefined) {
  const {
    services: { http },
  } = useKibana();
  const dispatch = useDispatch();
  const { addError } = useAppToasts();
  const onSuccess = useCallback(() => {
    if (noteId) {
      dispatch(
        appActions.deleteNote({
          id: noteId,
        })
      );
    }
  }, [dispatch, noteId]);

  const onError = useCallback(
    (err) => {
      addError(err, { title: 'Error deleting note (be sure to intl me)' });
    },
    [addError]
  );

  return useQuery(
    ['deleteNote'],
    () => {
      return http.fetch('/api/note', {
        method: 'DELETE',
        body: JSON.stringify({ noteId }),
      });
    },
    {
      enabled: !!noteId,
      onSuccess,
      onError,
    }
  );
}

const DeleteNoteButton = React.memo<{ noteId?: string | null; timelineId?: string | null }>(
  ({ noteId, timelineId }) => {
    const [noteToDelete, setNoteToDelete] = useState<string | null | undefined>(null);
    const [confirmingNoteId, setConfirmingNoteId] = useState<string | null | undefined>(null);
    const handleOpenDeleteModal = useCallback(async () => {
      setConfirmingNoteId(noteId);
    }, [noteId]);

    const handleCancelDelete = useCallback(() => {
      setConfirmingNoteId(null);
    }, []);

    const handleConfirmDelete = useCallback(() => {
      setNoteToDelete(confirmingNoteId);
      setConfirmingNoteId(null);
    }, [confirmingNoteId]);

    useDeleteNote(noteToDelete);

    if (noteId == null) {
      return null;
    } else {
      return (
        <>
          <EuiButtonIcon
            title={i18n.DELETE_NOTE}
            aria-label={i18n.DELETE_NOTE}
            data-test-subj={'delete-note'}
            color="text"
            iconType="trash"
            onClick={handleOpenDeleteModal}
          />
          {confirmingNoteId != null && (
            <DeleteNoteConfirm closeModal={handleCancelDelete} confirmModal={handleConfirmDelete} />
          )}
        </>
      );
    }
  }
);

DeleteNoteButton.displayName = 'DeleteNoteButton';

const NoteActions = React.memo<{
  eventId: string | null;
  timelineId?: string;
  noteId?: string | null;
}>(({ eventId, timelineId, noteId }) => {
  return eventId && timelineId ? (
    <>
      <ToggleEventDetailsButton eventId={eventId} timelineId={timelineId} />
      <DeleteNoteButton noteId={noteId} />
    </>
  ) : (
    <DeleteNoteButton noteId={noteId} timelineId={timelineId} />
  );
});

NoteActions.displayName = 'NoteActions';
/**
 * Renders a preview of a note in the All / Open Timelines table
 */

interface NotePreviewsProps {
  eventIdToNoteIds?: Record<string, string[]>;
  notes?: TimelineResultNote[] | null;
  timelineId?: string;
  showTimelineDescription?: boolean;
}

export const NotePreviews = React.memo<NotePreviewsProps>(
  ({ eventIdToNoteIds, notes, timelineId, showTimelineDescription }) => {
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const timeline = useDeepEqualSelector((state) =>
      timelineId ? getTimeline(state, timelineId) : null
    );

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
                actions: <SaveTimelineButton timelineId={timelineId} initialFocus="description" />,
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
              <NoteActions eventId={eventId} timelineId={timelineId} noteId={note.savedObjectId} />
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
      [eventIdToNoteIds, notes, timelineId]
    );

    return (
      <EuiCommentList
        data-test-subj="note-comment-list"
        comments={[...descriptionList, ...notesList]}
      />
    );
  }
);

NotePreviews.displayName = 'NotePreviews';
