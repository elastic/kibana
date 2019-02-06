/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { Note } from '../../../../lib/note';
import { AssociateNote, UpdateNote } from '../../../notes/helpers';
import { Pin } from '../../../pin';
import { NotesButton } from '../../properties/helpers';
import { ACTIONS_COLUMN_WIDTH, eventHasNotes, getPinTooltip } from '../helpers';
import * as i18n from '../translations';

interface Props {
  associateNote: AssociateNote;
  expanded: boolean;
  eventId: string;
  eventIsPinned: boolean;
  getNotesByIds: (eventIds: string[]) => Note[];
  notes: string[];
  onEventToggled: () => void;
  onPinClicked: () => void;
  showNotes: boolean;
  toggleShowNotes: () => void;
  updateNote: UpdateNote;
}

const ActionsContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: ${ACTIONS_COLUMN_WIDTH}px;
  overflow: hidden;
  width: ${ACTIONS_COLUMN_WIDTH}px;
`;

const ActionsRows = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
`;

const ActionsRow = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  min-width: ${ACTIONS_COLUMN_WIDTH}px;
  padding: 2px 8px 0 0;
  width: ${ACTIONS_COLUMN_WIDTH}px;
`;

const PinContainer = styled.div`
  margin-right: 7px;
`;

const emptyNotes: Note[] = [];

export const Actions = pure<Props>(
  ({
    associateNote,
    expanded,
    eventId,
    eventIsPinned,
    getNotesByIds,
    notes,
    onEventToggled,
    onPinClicked,
    showNotes,
    toggleShowNotes,
    updateNote,
  }) => (
    <ActionsContainer data-test-subj="timeline-actions-container">
      <ActionsRows data-test-subj="timeline-actions-rows">
        <ActionsRow data-test-subj="timeline-actions-row">
          <EuiButtonIcon
            aria-label={expanded ? i18n.COLLAPSE : i18n.EXPAND}
            color="text"
            iconType={expanded ? 'arrowDown' : 'arrowRight'}
            data-test-subj="timeline-action-expand"
            id={eventId}
            onClick={onEventToggled}
          />
          <EuiToolTip
            data-test-subj="timeline-action-pin-tool-tip"
            content={getPinTooltip({
              isPinned: eventIsPinned,
              eventHasNotes: eventHasNotes(notes),
            })}
          >
            <PinContainer>
              <Pin
                allowUnpinning={!eventHasNotes(notes)}
                pinned={eventIsPinned}
                data-test-subj="timeline-action-pin"
                onClick={onPinClicked}
              />
            </PinContainer>
          </EuiToolTip>
          <NotesButton
            animate={false}
            associateNote={associateNote}
            data-test-subj="timeline-action-notes-button"
            getNotesByIds={getNotesByIds}
            notes={notes || emptyNotes}
            showNotes={showNotes}
            size="s"
            toggleShowNotes={toggleShowNotes}
            toolTip={i18n.NOTES_TOOLTIP}
            updateNote={updateNote}
          />
        </ActionsRow>
      </ActionsRows>
    </ActionsContainer>
  )
);
