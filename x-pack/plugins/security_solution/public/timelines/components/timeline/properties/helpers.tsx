/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import type { TimelineTypeLiteral } from '../../../../../common/api/timeline';
import { TimelineType } from '../../../../../common/api/timeline';

import * as i18n from './translations';

const NotesCountBadge = styled(EuiBadge)`
  margin-left: 5px;
` as unknown as typeof EuiBadge;

NotesCountBadge.displayName = 'NotesCountBadge';

interface NotesButtonProps {
  ariaLabel?: string;
  isDisabled?: boolean;
  showNotes: boolean;
  toggleShowNotes: () => void;
  toolTip?: string;
  timelineType: TimelineTypeLiteral;
}

interface SmallNotesButtonProps {
  ariaLabel?: string;
  isDisabled?: boolean;
  toggleShowNotes: () => void;
  timelineType: TimelineTypeLiteral;
}

export const NOTES_BUTTON_CLASS_NAME = 'notes-button';

const SmallNotesButton = React.memo<SmallNotesButtonProps>(
  ({ ariaLabel = i18n.NOTES, isDisabled, toggleShowNotes, timelineType }) => {
    const isTemplate = timelineType === TimelineType.template;

    return (
      <EuiButtonIcon
        aria-label={ariaLabel}
        className={NOTES_BUTTON_CLASS_NAME}
        data-test-subj="timeline-notes-button-small"
        disabled={isDisabled}
        iconType="editorComment"
        onClick={toggleShowNotes}
        size="s"
        isDisabled={isTemplate}
      />
    );
  }
);
SmallNotesButton.displayName = 'SmallNotesButton';

export const NotesButton = React.memo<NotesButtonProps>(
  ({ ariaLabel, isDisabled, showNotes, timelineType, toggleShowNotes, toolTip }) =>
    showNotes ? (
      <SmallNotesButton
        ariaLabel={ariaLabel}
        isDisabled={isDisabled}
        toggleShowNotes={toggleShowNotes}
        timelineType={timelineType}
      />
    ) : (
      <EuiToolTip content={toolTip || ''} data-test-subj="timeline-notes-tool-tip">
        <SmallNotesButton
          ariaLabel={ariaLabel}
          isDisabled={isDisabled}
          toggleShowNotes={toggleShowNotes}
          timelineType={timelineType}
        />
      </EuiToolTip>
    )
);
NotesButton.displayName = 'NotesButton';
