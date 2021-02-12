/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TimelineType } from '../../../../../../common/types/timeline';
import * as i18n from '../translations';
import { NotesButton } from '../../properties/helpers';
import { ActionIconItem } from './action_icon_item';

interface AddEventNoteActionProps {
  ariaLabel?: string;
  showNotes: boolean;
  timelineType: TimelineType;
  toggleShowNotes: () => void;
}

const AddEventNoteActionComponent: React.FC<AddEventNoteActionProps> = ({
  ariaLabel,
  showNotes,
  timelineType,
  toggleShowNotes,
}) => (
  <ActionIconItem>
    <NotesButton
      ariaLabel={ariaLabel}
      data-test-subj="add-note"
      showNotes={showNotes}
      timelineType={timelineType}
      toggleShowNotes={toggleShowNotes}
      toolTip={
        timelineType === TimelineType.template ? i18n.NOTES_DISABLE_TOOLTIP : i18n.NOTES_TOOLTIP
      }
    />
  </ActionIconItem>
);

AddEventNoteActionComponent.displayName = 'AddEventNoteActionComponent';

export const AddEventNoteAction = React.memo(AddEventNoteActionComponent);
