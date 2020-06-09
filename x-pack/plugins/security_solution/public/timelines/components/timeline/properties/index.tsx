/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useMemo } from 'react';

import { TimelineStatus, TimelineTypeLiteral } from '../../../../../common/types/timeline';
import { useThrottledResizeObserver } from '../../../../common/components/utils';
import { Note } from '../../../../common/lib/note';
import { InputsModelId } from '../../../../common/store/inputs/constants';

import { AssociateNote, UpdateNote } from '../../notes/helpers';

import { TimelineProperties } from './styles';
import { PropertiesRight } from './properties_right';
import { PropertiesLeft } from './properties_left';

type CreateTimeline = ({
  id,
  show,
  timelineType,
}: {
  id: string;
  show?: boolean;
  timelineType?: TimelineTypeLiteral;
}) => void;
type UpdateIsFavorite = ({ id, isFavorite }: { id: string; isFavorite: boolean }) => void;
type UpdateTitle = ({ id, title }: { id: string; title: string }) => void;
type UpdateDescription = ({ id, description }: { id: string; description: string }) => void;
type ToggleLock = ({ linkToId }: { linkToId: InputsModelId }) => void;

interface Props {
  associateNote: AssociateNote;
  createTimeline: CreateTimeline;
  description: string;
  getNotesByIds: (noteIds: string[]) => Note[];
  isDataInTimeline: boolean;
  isDatepickerLocked: boolean;
  isFavorite: boolean;
  noteIds: string[];
  timelineId: string;
  status: TimelineStatus;
  title: string;
  toggleLock: ToggleLock;
  updateDescription: UpdateDescription;
  updateIsFavorite: UpdateIsFavorite;
  updateNote: UpdateNote;
  updateTitle: UpdateTitle;
  usersViewing: string[];
}

const rightGutter = 60; // px
export const datePickerThreshold = 600;
export const showNotesThreshold = 810;
export const showDescriptionThreshold = 970;

const starIconWidth = 30;
const nameWidth = 155;
const descriptionWidth = 165;
const noteWidth = 130;
const settingsWidth = 55;

/** Displays the properties of a timeline, i.e. name, description, notes, etc */
export const Properties = React.memo<Props>(
  ({
    associateNote,
    createTimeline,
    description,
    getNotesByIds,
    isDataInTimeline,
    isDatepickerLocked,
    isFavorite,
    noteIds,
    status,
    timelineId,
    title,
    toggleLock,
    updateDescription,
    updateIsFavorite,
    updateNote,
    updateTitle,
    usersViewing,
  }) => {
    const { ref, width = 0 } = useThrottledResizeObserver(300);
    const [showActions, setShowActions] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);

    const onButtonClick = useCallback(() => setShowActions(!showActions), [showActions]);
    const onToggleShowNotes = useCallback(() => setShowNotes(!showNotes), [showNotes]);
    const onClosePopover = useCallback(() => setShowActions(false), []);
    const onCloseTimelineModal = useCallback(() => setShowTimelineModal(false), []);
    const onToggleLock = useCallback(() => toggleLock({ linkToId: 'timeline' }), [toggleLock]);
    const onOpenTimelineModal = useCallback(() => {
      onClosePopover();
      setShowTimelineModal(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const datePickerWidth = useMemo(
      () =>
        width -
        rightGutter -
        starIconWidth -
        nameWidth -
        (width >= showDescriptionThreshold ? descriptionWidth : 0) -
        noteWidth -
        settingsWidth,
      [width]
    );

    return (
      <TimelineProperties ref={ref} data-test-subj="timeline-properties">
        <PropertiesLeft
          associateNote={associateNote}
          datePickerWidth={
            datePickerWidth > datePickerThreshold ? datePickerThreshold : datePickerWidth
          }
          description={description}
          getNotesByIds={getNotesByIds}
          isDatepickerLocked={isDatepickerLocked}
          isFavorite={isFavorite}
          noteIds={noteIds}
          onToggleShowNotes={onToggleShowNotes}
          showDescription={width >= showDescriptionThreshold}
          showNotes={showNotes}
          showNotesFromWidth={width >= showNotesThreshold}
          timelineId={timelineId}
          title={title}
          toggleLock={onToggleLock}
          updateDescription={updateDescription}
          updateIsFavorite={updateIsFavorite}
          updateNote={updateNote}
          updateTitle={updateTitle}
        />
        <PropertiesRight
          associateNote={associateNote}
          description={description}
          getNotesByIds={getNotesByIds}
          isDataInTimeline={isDataInTimeline}
          noteIds={noteIds}
          onButtonClick={onButtonClick}
          onClosePopover={onClosePopover}
          onCloseTimelineModal={onCloseTimelineModal}
          onOpenTimelineModal={onOpenTimelineModal}
          onToggleShowNotes={onToggleShowNotes}
          showActions={showActions}
          showDescription={width < showDescriptionThreshold}
          showNotes={showNotes}
          showNotesFromWidth={width < showNotesThreshold}
          showTimelineModal={showTimelineModal}
          showUsersView={title.length > 0}
          status={status}
          timelineId={timelineId}
          title={title}
          updateDescription={updateDescription}
          updateNote={updateNote}
          usersViewing={usersViewing}
        />
      </TimelineProperties>
    );
  }
);

Properties.displayName = 'Properties';
