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
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { TimelineResultNote } from '../types';
import { getEmptyValue, defaultToEmptyTag } from '../../../../common/components/empty_value';
import { MarkdownRenderer } from '../../../../common/components/markdown_editor';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { NOTE_CONTENT_CLASS_NAME } from '../../timeline/body/helpers';
import * as i18n from './translations';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { SaveTimelineButton } from '../../timeline/header/save_timeline_button';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';

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
        timelineId,
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
                timelineIcon: (
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
            actions:
              eventId && timelineId ? (
                <ToggleEventDetailsButton eventId={eventId} timelineId={timelineId} />
              ) : null,
            timelineIcon: (
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
