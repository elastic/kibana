/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { NotesButton } from '../../../timelines/components/timeline/properties/helpers';
import { TimelineType } from '../../../../common/api/timeline';
import { useUserPrivileges } from '../user_privileges';
import * as i18n from './translations';
import { ActionIconItem } from './action_icon_item';

interface AddEventNoteActionProps {
  ariaLabel?: string;
  showNotes: boolean;
  timelineType: TimelineType;
  isTimelineSaved: boolean;
  toggleShowNotes: () => void;
}

const AddEventNoteActionComponent: React.FC<AddEventNoteActionProps> = ({
  ariaLabel,
  showNotes,
  timelineType,
  isTimelineSaved,
  toggleShowNotes,
}) => {
  const { kibanaSecuritySolutionsPrivileges } = useUserPrivileges();
  const hasSecurityCrudPriviliges = kibanaSecuritySolutionsPrivileges.crud === true;
  const isTimelineTemplate = timelineType === TimelineType.template;

  const isDisabled = isTimelineTemplate || !isTimelineSaved || !hasSecurityCrudPriviliges;

  let toolTipText = i18n.NOTES_TOOLTIP;
  if (isTimelineTemplate) {
    toolTipText = i18n.NOTES_DISABLE_TOOLTIP;
  } else if (!isTimelineSaved) {
    toolTipText = i18n.NOTES_DISABLED_UNSAVED_TIMELINE;
  }

  return (
    <ActionIconItem>
      <NotesButton
        ariaLabel={ariaLabel}
        data-test-subj="add-note"
        isDisabled={isDisabled}
        showNotes={showNotes}
        timelineType={timelineType}
        toggleShowNotes={toggleShowNotes}
        toolTip={toolTipText}
      />
    </ActionIconItem>
  );
};

AddEventNoteActionComponent.displayName = 'AddEventNoteActionComponent';

export const AddEventNoteAction = React.memo(AddEventNoteActionComponent);
