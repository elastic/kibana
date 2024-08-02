/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { NotesButton } from '../../../timelines/components/timeline/properties/helpers';
import { TimelineType } from '../../../../common/api/timeline';
import { useUserPrivileges } from '../user_privileges';
import * as i18n from './translations';
import { ActionIconItem } from './action_icon_item';

interface AddEventNoteActionProps {
  ariaLabel?: string;
  timelineType: TimelineType;
  toggleShowNotes?: () => void | ((eventId: string) => void);
  eventId?: string;
  /*
   * Number of notes associated with the event
   */
  notesCount: number;
}

const AddEventNoteActionComponent: React.FC<AddEventNoteActionProps> = ({
  ariaLabel,
  timelineType,
  toggleShowNotes,
  eventId,
  notesCount,
}) => {
  const { kibanaSecuritySolutionsPrivileges } = useUserPrivileges();

  const NOTES_TOOLTIP = useMemo(
    () => (notesCount > 0 ? i18n.NOTES_COUNT_TOOLTIP({ notesCount }) : i18n.NOTES_ADD_TOOLTIP),
    [notesCount]
  );

  return (
    <ActionIconItem>
      <NotesButton
        ariaLabel={ariaLabel}
        data-test-subj="add-note"
        isDisabled={kibanaSecuritySolutionsPrivileges.crud === false}
        timelineType={timelineType}
        toggleShowNotes={toggleShowNotes}
        toolTip={
          timelineType === TimelineType.template ? i18n.NOTES_DISABLE_TOOLTIP : NOTES_TOOLTIP
        }
        eventId={eventId}
        notesCount={notesCount}
      />
    </ActionIconItem>
  );
};

AddEventNoteActionComponent.displayName = 'AddEventNoteActionComponent';

export const AddEventNoteAction = React.memo(AddEventNoteActionComponent);
