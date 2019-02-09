/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
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
  getNotesByIds: (noteIds: string[]) => Note[];
  noteIds: string[];
  onEventToggled: () => void;
  onPinClicked: () => void;
  showNotes: boolean;
  toggleShowNotes: () => void;
  updateNote: UpdateNote;
}

const ActionsContainer = styled(EuiFlexGroup)`
  min-width: ${ACTIONS_COLUMN_WIDTH}px;
  overflow: hidden;
  padding: 2px 10px 0 0;
  width: ${ACTIONS_COLUMN_WIDTH}px;
`;

const PinContainer = styled.div`
  margin: 0 8px 0 2px;
`;

const emptyNotes: string[] = [];

export const Actions = pure<Props>(
  ({
    associateNote,
    expanded,
    eventId,
    eventIsPinned,
    getNotesByIds,
    noteIds,
    onEventToggled,
    onPinClicked,
    showNotes,
    toggleShowNotes,
    updateNote,
  }) => (
    <ActionsContainer
      alignItems="flexStart"
      data-test-subj="timeline-actions-container"
      direction="row"
      gutterSize="none"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem>
        <EuiButtonIcon
          aria-label={expanded ? i18n.COLLAPSE : i18n.EXPAND}
          color="text"
          iconType={expanded ? 'arrowDown' : 'arrowRight'}
          data-test-subj="timeline-action-expand"
          id={eventId}
          onClick={onEventToggled}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiToolTip
          data-test-subj="timeline-action-pin-tool-tip"
          content={getPinTooltip({
            isPinned: eventIsPinned,
            eventHasNotes: eventHasNotes(noteIds),
          })}
        >
          <PinContainer>
            <Pin
              allowUnpinning={!eventHasNotes(noteIds)}
              pinned={eventIsPinned}
              data-test-subj="timeline-action-pin"
              onClick={onPinClicked}
            />
          </PinContainer>
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem>
        <NotesButton
          animate={false}
          associateNote={associateNote}
          data-test-subj="timeline-action-notes-button"
          getNotesByIds={getNotesByIds}
          noteIds={noteIds || emptyNotes}
          showNotes={showNotes}
          size="s"
          toggleShowNotes={toggleShowNotes}
          toolTip={i18n.NOTES_TOOLTIP}
          updateNote={updateNote}
        />
      </EuiFlexItem>
    </ActionsContainer>
  )
);
