/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import uuid from 'uuid';

import { useShallowEqualSelector } from '../../../../../common/hooks/use_selector';
import { Ecs } from '../../../../../../common/ecs';
import { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import { Note } from '../../../../../common/lib/note';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import { AssociateNote, UpdateNote } from '../../../notes/helpers';
import { OnColumnResized, OnPinEvent, OnRowSelected, OnUnPinEvent } from '../../events';
import { EventsTrData } from '../../styles';
import { Actions } from '../actions';
import { DataDrivenColumns } from '../data_driven_columns';
import {
  eventHasNotes,
  getEventType,
  getPinOnClick,
  InvestigateInResolverAction,
} from '../helpers';
import { ColumnRenderer } from '../renderers/column_renderer';
import { AlertContextMenu } from '../../../../../detections/components/alerts_table/timeline_actions/alert_context_menu';
import { InvestigateInTimelineAction } from '../../../../../detections/components/alerts_table/timeline_actions/investigate_in_timeline_action';
import { AddEventNoteAction } from '../actions/add_note_icon_item';
import { PinEventAction } from '../actions/pin_event_action';
import { inputsModel } from '../../../../../common/store';
import { TimelineId } from '../../../../../../common/types/timeline';

import { TimelineModel } from '../../../../store/timeline/model';

interface Props {
  id: string;
  actionsColumnWidth: number;
  associateNote: AssociateNote;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  expanded: boolean;
  getNotesByIds: (noteIds: string[]) => Note[];
  isEventPinned: boolean;
  isEventViewer?: boolean;
  loading: boolean;
  loadingEventIds: Readonly<string[]>;
  onColumnResized: OnColumnResized;
  onEventToggled: () => void;
  onPinEvent: OnPinEvent;
  onRowSelected: OnRowSelected;
  onUnPinEvent: OnUnPinEvent;
  refetch: inputsModel.Refetch;
  onRuleChange?: () => void;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  showNotes: boolean;
  timelineId: string;
  toggleShowNotes: () => void;
  updateNote: UpdateNote;
}

export const getNewNoteId = (): string => uuid.v4();

const emptyNotes: string[] = [];

export const EventColumnView = React.memo<Props>(
  ({
    id,
    actionsColumnWidth,
    associateNote,
    columnHeaders,
    columnRenderers,
    data,
    ecsData,
    eventIdToNoteIds,
    expanded,
    getNotesByIds,
    isEventPinned = false,
    isEventViewer = false,
    loading,
    loadingEventIds,
    onColumnResized,
    onEventToggled,
    onPinEvent,
    onRowSelected,
    onUnPinEvent,
    refetch,
    onRuleChange,
    selectedEventIds,
    showCheckboxes,
    showNotes,
    timelineId,
    toggleShowNotes,
    updateNote,
  }) => {
    const { timelineType, status } = useShallowEqualSelector<TimelineModel>(
      (state) => state.timeline.timelineById[timelineId]
    );

    const handlePinClicked = useCallback(
      () =>
        getPinOnClick({
          allowUnpinning: !eventHasNotes(eventIdToNoteIds[id]),
          eventId: id,
          onPinEvent,
          onUnPinEvent,
          isEventPinned,
        }),
      [eventIdToNoteIds, id, isEventPinned, onPinEvent, onUnPinEvent]
    );

    const eventType = getEventType(ecsData);

    const additionalActions = useMemo<JSX.Element[]>(
      () => [
        <InvestigateInResolverAction
          key="investigate-in-resolver"
          timelineId={timelineId}
          ecsData={ecsData}
        />,
        ...(timelineId !== TimelineId.active && eventType === 'signal'
          ? [
              <InvestigateInTimelineAction
                key="investigate-in-timeline"
                ecsRowData={ecsData}
                nonEcsRowData={data}
              />,
            ]
          : []),
        ...(!isEventViewer
          ? [
              <AddEventNoteAction
                key="add-event-note"
                associateNote={associateNote}
                getNotesByIds={getNotesByIds}
                noteIds={eventIdToNoteIds[id] || emptyNotes}
                showNotes={showNotes}
                toggleShowNotes={toggleShowNotes}
                updateNote={updateNote}
                status={status}
                timelineType={timelineType}
              />,
              <PinEventAction
                key="pin-event"
                onPinClicked={handlePinClicked}
                noteIds={eventIdToNoteIds[id] || emptyNotes}
                eventIsPinned={isEventPinned}
                timelineType={timelineType}
              />,
            ]
          : []),
        <AlertContextMenu
          key="alert-context-menu"
          ecsRowData={ecsData}
          timelineId={timelineId}
          disabled={eventType !== 'signal'}
          refetch={refetch}
          onRuleChange={onRuleChange}
        />,
      ],
      [
        associateNote,
        data,
        ecsData,
        eventIdToNoteIds,
        eventType,
        getNotesByIds,
        handlePinClicked,
        id,
        isEventPinned,
        isEventViewer,
        refetch,
        onRuleChange,
        showNotes,
        status,
        timelineId,
        timelineType,
        toggleShowNotes,
        updateNote,
      ]
    );

    return (
      <EventsTrData data-test-subj="event-column-view">
        <Actions
          actionsColumnWidth={actionsColumnWidth}
          additionalActions={additionalActions}
          checked={Object.keys(selectedEventIds).includes(id)}
          onRowSelected={onRowSelected}
          expanded={expanded}
          data-test-subj="actions"
          eventId={id}
          loading={loading}
          loadingEventIds={loadingEventIds}
          onEventToggled={onEventToggled}
          showCheckboxes={showCheckboxes}
        />

        <DataDrivenColumns
          _id={id}
          columnHeaders={columnHeaders}
          columnRenderers={columnRenderers}
          data={data}
          ecsData={ecsData}
          onColumnResized={onColumnResized}
          timelineId={timelineId}
        />
      </EventsTrData>
    );
  }
);

EventColumnView.displayName = 'EventColumnView';
