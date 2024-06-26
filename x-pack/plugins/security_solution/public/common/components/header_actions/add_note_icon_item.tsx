/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { NotesFlyout } from '../../../timelines/components/timeline/properties/notes_flyout';
import { NotesButton } from '../../../timelines/components/timeline/properties/helpers';
import { TimelineType } from '../../../../common/api/timeline';
import { useUserPrivileges } from '../user_privileges';
import * as i18n from './translations';
import { ActionIconItem } from './action_icon_item';

interface AddEventNoteActionProps {
  ariaLabel?: string;
  showNotes: boolean;
  timelineType: TimelineType;
  toggleShowNotes: () => void;
  eventId?: string;
  notesCount?: number;
  refetch?: () => void;
  eventIdToNoteIds?: Record<string, string[]>;
}

const EMPTY_STRING_ARRAY: string[] = [];

const AddEventNoteActionComponent: React.FC<AddEventNoteActionProps> = ({
  ariaLabel,
  showNotes,
  timelineType,
  toggleShowNotes,
  eventId,
  notesCount,
  refetch,
  eventIdToNoteIds,
}) => {
  const [areNotesVisible, setAreNotesVisible] = React.useState(false);

  const toggleNotes = useCallback(() => {
    setAreNotesVisible((prev) => !prev);
    toggleShowNotes?.();
  }, [toggleShowNotes]);

  const handleNotesFlyoutClose = useCallback(() => {
    setAreNotesVisible(false);
  }, []);

  const noteIds = useMemo(
    () => (eventId && eventIdToNoteIds?.[eventId]) ?? EMPTY_STRING_ARRAY,
    [eventIdToNoteIds, eventId]
  );

  const { kibanaSecuritySolutionsPrivileges } = useUserPrivileges();

  return (
    <>
      <NotesFlyout
        eventId={eventId}
        onToggleShowNotes={toggleNotes}
        refetch={refetch}
        show={areNotesVisible}
        onClose={handleNotesFlyoutClose}
        eventIdToNoteIds={eventIdToNoteIds}
      />

      <ActionIconItem>
        <NotesButton
          ariaLabel={ariaLabel}
          data-test-subj="add-note"
          isDisabled={kibanaSecuritySolutionsPrivileges.crud === false}
          showNotes={showNotes}
          timelineType={timelineType}
          toggleShowNotes={toggleNotes}
          toolTip={
            timelineType === TimelineType.template
              ? i18n.NOTES_DISABLE_TOOLTIP
              : i18n.NOTES_TOOLTIP({ notesCount: noteIds.length })
          }
          eventId={eventId}
          notesCount={noteIds.length}
        />
      </ActionIconItem>
    </>
  );
};

AddEventNoteActionComponent.displayName = 'AddEventNoteActionComponent';

export const AddEventNoteAction = React.memo(AddEventNoteActionComponent);
