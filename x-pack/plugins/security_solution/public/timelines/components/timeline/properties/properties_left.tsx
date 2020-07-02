/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';

import React from 'react';
import styled from 'styled-components';
import { Description, Name, NotesButton, StarIcon } from './helpers';
import { AssociateNote, UpdateNote } from '../../notes/helpers';

import { Note } from '../../../../common/lib/note';
import { SuperDatePicker } from '../../../../common/components/super_date_picker';

import { TimelineTypeLiteral, TimelineStatusLiteral } from '../../../../../common/types/timeline';

import * as i18n from './translations';

type UpdateIsFavorite = ({ id, isFavorite }: { id: string; isFavorite: boolean }) => void;
type UpdateTitle = ({ id, title }: { id: string; title: string }) => void;
type UpdateDescription = ({ id, description }: { id: string; description: string }) => void;

interface Props {
  isFavorite: boolean;
  timelineId: string;
  timelineType: TimelineTypeLiteral;
  updateIsFavorite: UpdateIsFavorite;
  showDescription: boolean;
  description: string;
  title: string;
  updateTitle: UpdateTitle;
  updateDescription: UpdateDescription;
  showNotes: boolean;
  status: TimelineStatusLiteral;
  associateNote: AssociateNote;
  showNotesFromWidth: boolean;
  getNotesByIds: (noteIds: string[]) => Note[];
  onToggleShowNotes: () => void;
  noteIds: string[];
  updateNote: UpdateNote;
  isDatepickerLocked: boolean;
  toggleLock: () => void;
  datePickerWidth: number;
}

export const PropertiesLeftStyle = styled(EuiFlexGroup)`
  width: 100%;
`;

PropertiesLeftStyle.displayName = 'PropertiesLeftStyle';

export const LockIconContainer = styled(EuiFlexItem)`
  margin-right: 2px;
`;

LockIconContainer.displayName = 'LockIconContainer';

interface WidthProp {
  width: number;
}

export const DatePicker = styled(EuiFlexItem).attrs<WidthProp>(({ width }) => ({
  style: {
    width: `${width}px`,
  },
}))<WidthProp>`
  .euiSuperDatePicker__flexWrapper {
    max-width: none;
    width: auto;
  }
`;

DatePicker.displayName = 'DatePicker';

export const PropertiesLeft = React.memo<Props>(
  ({
    isFavorite,
    timelineId,
    updateIsFavorite,
    showDescription,
    description,
    title,
    timelineType,
    updateTitle,
    updateDescription,
    status,
    showNotes,
    showNotesFromWidth,
    associateNote,
    getNotesByIds,
    noteIds,
    onToggleShowNotes,
    updateNote,
    isDatepickerLocked,
    toggleLock,
    datePickerWidth,
  }) => (
    <PropertiesLeftStyle alignItems="center" data-test-subj="properties-left" gutterSize="s">
      <EuiFlexItem grow={false}>
        <StarIcon
          isFavorite={isFavorite}
          timelineId={timelineId}
          updateIsFavorite={updateIsFavorite}
        />
      </EuiFlexItem>

      <Name timelineId={timelineId} title={title} updateTitle={updateTitle} />

      {showDescription ? (
        <EuiFlexItem grow={2}>
          <Description
            description={description}
            timelineId={timelineId}
            updateDescription={updateDescription}
          />
        </EuiFlexItem>
      ) : null}

      {showNotesFromWidth ? (
        <EuiFlexItem grow={false}>
          <NotesButton
            animate={true}
            associateNote={associateNote}
            getNotesByIds={getNotesByIds}
            noteIds={noteIds}
            showNotes={showNotes}
            size="l"
            status={status}
            text={i18n.NOTES}
            toggleShowNotes={onToggleShowNotes}
            toolTip={i18n.NOTES_TOOL_TIP}
            updateNote={updateNote}
            timelineType={timelineType}
          />
        </EuiFlexItem>
      ) : null}

      <EuiFlexItem grow={1}>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="none"
          data-test-subj="timeline-date-picker-container"
        >
          <LockIconContainer grow={false}>
            <EuiToolTip
              data-test-subj="timeline-date-picker-lock-tooltip"
              position="top"
              content={
                isDatepickerLocked
                  ? i18n.LOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP
                  : i18n.UNLOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP
              }
            >
              <EuiButtonIcon
                data-test-subj={`timeline-date-picker-${
                  isDatepickerLocked ? 'lock' : 'unlock'
                }-button`}
                color="primary"
                onClick={toggleLock}
                iconType={isDatepickerLocked ? 'lock' : 'lockOpen'}
                aria-label={
                  isDatepickerLocked
                    ? i18n.UNLOCK_SYNC_MAIN_DATE_PICKER_ARIA
                    : i18n.LOCK_SYNC_MAIN_DATE_PICKER_ARIA
                }
              />
            </EuiToolTip>
          </LockIconContainer>
          <DatePicker grow={1} width={datePickerWidth}>
            <SuperDatePicker id="timeline" timelineId={timelineId} />
          </DatePicker>
        </EuiFlexGroup>
      </EuiFlexItem>
    </PropertiesLeftStyle>
  )
);

PropertiesLeft.displayName = 'PropertiesLeft';
