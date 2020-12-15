/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';

import { useShallowEqualSelector } from '../../../../../common/hooks/use_selector';
import { Ecs } from '../../../../../../common/ecs';
import { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import { OnPinEvent, OnRowSelected, OnUnPinEvent } from '../../events';
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
import { timelineSelectors } from '../../../../store/timeline';
import { timelineDefaults } from '../../../../store/timeline/defaults';
import { AddToCaseAction } from '../../../../../cases/components/timeline_actions/add_to_case_action';

interface Props {
  id: string;
  actionsColumnWidth: number;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  expanded: boolean;
  isEventPinned: boolean;
  isEventViewer?: boolean;
  loadingEventIds: Readonly<string[]>;
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
}

const emptyNotes: string[] = [];

export const EventColumnView = React.memo<Props>(
  ({
    id,
    actionsColumnWidth,
    columnHeaders,
    columnRenderers,
    data,
    ecsData,
    eventIdToNoteIds,
    expanded,
    isEventPinned = false,
    isEventViewer = false,
    loadingEventIds,
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
  }) => {
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const timelineType = useShallowEqualSelector(
      (state) => (getTimeline(state, timelineId) ?? timelineDefaults).timelineType
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
                showNotes={showNotes}
                toggleShowNotes={toggleShowNotes}
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
        ...([
          TimelineId.detectionsPage,
          TimelineId.detectionsRulesDetailsPage,
          TimelineId.active,
        ].includes(timelineId as TimelineId)
          ? [
              <AddToCaseAction
                key="attach-to-case"
                ecsRowData={ecsData}
                disabled={eventType !== 'signal'}
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
        data,
        ecsData,
        eventIdToNoteIds,
        eventType,
        handlePinClicked,
        id,
        isEventPinned,
        isEventViewer,
        refetch,
        onRuleChange,
        showNotes,
        timelineId,
        timelineType,
        toggleShowNotes,
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
          timelineId={timelineId}
        />
      </EventsTrData>
    );
  }
);

EventColumnView.displayName = 'EventColumnView';
