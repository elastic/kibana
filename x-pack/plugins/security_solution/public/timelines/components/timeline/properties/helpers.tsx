/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';

import type { TimelineTypeLiteral } from '../../../../../common/api/timeline';
import { TimelineType } from '../../../../../common/api/timeline';

import * as i18n from './translations';

const NotesCountBadge = styled(EuiBadge)`
  margin-left: 5px;
` as unknown as typeof EuiBadge;

NotesCountBadge.displayName = 'NotesCountBadge';

export const NotificationDot = styled.span`
  position: absolute;
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.eui.euiColorDanger};
  top: 17%;
  left: 52%;
`;

const NotesButtonContainer = styled(EuiFlexGroup)`
  position: relative;
`;

export const NOTES_BUTTON_CLASS_NAME = 'notes-button';

interface SmallNotesButtonProps {
  ariaLabel?: string;
  isDisabled?: boolean;
  toggleShowNotes: (eventId?: string) => void;
  timelineType: TimelineTypeLiteral;
  eventId?: string;
  /**
   * Number of notes. If > 0, then a red dot is shown in the top right corner of the icon.
   */
  notesCount: number;
}

const SmallNotesButton = React.memo<SmallNotesButtonProps>(
  ({ ariaLabel = i18n.NOTES, isDisabled, toggleShowNotes, timelineType, eventId, notesCount }) => {
    const isTemplate = timelineType === TimelineType.template;
    const onClick = useCallback(() => {
      if (eventId != null) {
        toggleShowNotes(eventId);
      } else {
        toggleShowNotes();
      }
    }, [toggleShowNotes, eventId]);

    return (
      <NotesButtonContainer>
        <EuiFlexItem grow={false}>
          {notesCount > 0 ? <NotificationDot /> : null}
          <EuiButtonIcon
            aria-label={ariaLabel}
            className={NOTES_BUTTON_CLASS_NAME}
            data-test-subj="timeline-notes-button-small"
            disabled={isDisabled}
            iconType="editorComment"
            onClick={onClick}
            size="s"
            isDisabled={isTemplate}
          />
        </EuiFlexItem>
      </NotesButtonContainer>
    );
  }
);
SmallNotesButton.displayName = 'SmallNotesButton';

interface NotesButtonProps {
  ariaLabel?: string;
  isDisabled?: boolean;
  showNotes: boolean;
  toggleShowNotes: () => void | ((eventId: string) => void);
  toolTip?: string;
  timelineType: TimelineTypeLiteral;
  eventId?: string;
  /**
   * Number of notes associated with the event.
   * Defaults to 0
   */
  notesCount?: number;
}

export const NotesButton = React.memo<NotesButtonProps>(
  ({
    ariaLabel,
    isDisabled,
    showNotes,
    timelineType,
    toggleShowNotes,
    toolTip,
    eventId,
    notesCount = 0,
  }) =>
    showNotes ? (
      <SmallNotesButton
        ariaLabel={ariaLabel}
        isDisabled={isDisabled}
        toggleShowNotes={toggleShowNotes}
        timelineType={timelineType}
        eventId={eventId}
        notesCount={notesCount}
      />
    ) : (
      <EuiToolTip content={toolTip || ''} data-test-subj="timeline-notes-tool-tip">
        <SmallNotesButton
          ariaLabel={ariaLabel}
          isDisabled={isDisabled}
          toggleShowNotes={toggleShowNotes}
          timelineType={timelineType}
          eventId={eventId}
          notesCount={notesCount}
        />
      </EuiToolTip>
    )
);
NotesButton.displayName = 'NotesButton';
