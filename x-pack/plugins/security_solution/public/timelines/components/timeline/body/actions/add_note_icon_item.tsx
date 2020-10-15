/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { TimelineType, TimelineStatus } from '../../../../../../common/types/timeline';
import { AssociateNote, UpdateNote } from '../../../notes/helpers';
import * as i18n from '../translations';
import { NotesButton } from '../../properties/helpers';
import { Note } from '../../../../../common/lib/note';
import { ActionIconItem } from './action_icon_item';

interface AddEventNoteActionProps {
  associateNote: AssociateNote;
  getNotesByIds: (noteIds: string[]) => Note[];
  noteIds: string[];
  showNotes: boolean;
  status: TimelineStatus;
  timelineType: TimelineType;
  toggleShowNotes: () => void;
  updateNote: UpdateNote;
}

const AddEventNoteActionComponent: React.FC<AddEventNoteActionProps> = ({
  associateNote,
  getNotesByIds,
  noteIds,
  showNotes,
  status,
  timelineType,
  toggleShowNotes,
  updateNote,
}) => (
  <ActionIconItem id="add-note">
    <NotesButton
      animate={false}
      associateNote={associateNote}
      data-test-subj="add-note"
      getNotesByIds={getNotesByIds}
      noteIds={noteIds}
      showNotes={showNotes}
      size="s"
      status={status}
      timelineType={timelineType}
      toggleShowNotes={toggleShowNotes}
      toolTip={
        timelineType === TimelineType.template ? i18n.NOTES_DISABLE_TOOLTIP : i18n.NOTES_TOOLTIP
      }
      updateNote={updateNote}
    />
  </ActionIconItem>
);

AddEventNoteActionComponent.displayName = 'AddEventNoteActionComponent';

export const AddEventNoteAction = React.memo(AddEventNoteActionComponent);
