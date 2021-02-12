/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { useShallowEqualSelector } from '../../../../../common/hooks/use_selector';
import { Ecs } from '../../../../../../common/ecs';
import { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import { OnPinEvent, OnRowSelected, OnUnPinEvent } from '../../events';
import { EventsTrData } from '../../styles';
import { Actions } from '../actions';
import { DataDrivenColumns, getMappedNonEcsValue } from '../data_driven_columns';
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
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { timelineSelectors } from '../../../../store/timeline';
import { timelineDefaults } from '../../../../store/timeline/defaults';
import { AddToCaseAction } from '../../../../../cases/components/timeline_actions/add_to_case_action';
import * as i18n from '../translations';

interface Props {
  id: string;
  actionsColumnWidth: number;
  ariaRowindex: number;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  isEventPinned: boolean;
  isEventViewer?: boolean;
  loadingEventIds: Readonly<string[]>;
  notesCount: number;
  onEventDetailsPanelOpened: () => void;
  onPinEvent: OnPinEvent;
  onRowSelected: OnRowSelected;
  onUnPinEvent: OnUnPinEvent;
  refetch: inputsModel.Refetch;
  onRuleChange?: () => void;
  hasRowRenderers: boolean;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  showNotes: boolean;
  tabType?: TimelineTabs;
  timelineId: string;
  toggleShowNotes: () => void;
}

const emptyNotes: string[] = [];

export const EventColumnView = React.memo<Props>(
  ({
    id,
    actionsColumnWidth,
    ariaRowindex,
    columnHeaders,
    columnRenderers,
    data,
    ecsData,
    eventIdToNoteIds,
    isEventPinned = false,
    isEventViewer = false,
    loadingEventIds,
    notesCount,
    onEventDetailsPanelOpened,
    onPinEvent,
    onRowSelected,
    onUnPinEvent,
    refetch,
    hasRowRenderers,
    onRuleChange,
    selectedEventIds,
    showCheckboxes,
    showNotes,
    tabType,
    timelineId,
    toggleShowNotes,
  }) => {
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const timelineType = useShallowEqualSelector(
      (state) => (getTimeline(state, timelineId) ?? timelineDefaults).timelineType
    );

    // Each action button shall announce itself to screen readers via an `aria-label`
    // in the following format:
    // "button description, for the event in row {ariaRowindex}, with columns {columnValues}",
    // so we combine the column values here:
    const columnValues = useMemo(
      () =>
        columnHeaders
          .map(
            (header) =>
              getMappedNonEcsValue({
                data,
                fieldName: header.id,
              }) ?? []
          )
          .join(' '),
      [columnHeaders, data]
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
          ariaLabel={i18n.ACTION_INVESTIGATE_IN_RESOLVER_FOR_ROW({ ariaRowindex, columnValues })}
          key="investigate-in-resolver"
          timelineId={timelineId}
          ecsData={ecsData}
        />,
        ...(timelineId !== TimelineId.active && eventType === 'signal'
          ? [
              <InvestigateInTimelineAction
                ariaLabel={i18n.SEND_ALERT_TO_TIMELINE_FOR_ROW({ ariaRowindex, columnValues })}
                key="investigate-in-timeline"
                ecsRowData={ecsData}
                nonEcsRowData={data}
              />,
            ]
          : []),
        ...(!isEventViewer
          ? [
              <AddEventNoteAction
                ariaLabel={i18n.ADD_NOTES_FOR_ROW({ ariaRowindex, columnValues })}
                key="add-event-note"
                showNotes={showNotes}
                toggleShowNotes={toggleShowNotes}
                timelineType={timelineType}
              />,
              <PinEventAction
                ariaLabel={i18n.PIN_EVENT_FOR_ROW({ ariaRowindex, columnValues, isEventPinned })}
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
                ariaLabel={i18n.ATTACH_ALERT_TO_CASE_FOR_ROW({ ariaRowindex, columnValues })}
                key="attach-to-case"
                ecsRowData={ecsData}
                disabled={eventType !== 'signal'}
              />,
            ]
          : []),
        <AlertContextMenu
          ariaLabel={i18n.MORE_ACTIONS_FOR_ROW({ ariaRowindex, columnValues })}
          key="alert-context-menu"
          ecsRowData={ecsData}
          timelineId={timelineId}
          disabled={eventType !== 'signal'}
          refetch={refetch}
          onRuleChange={onRuleChange}
        />,
      ],
      [
        ariaRowindex,
        columnValues,
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
          ariaRowindex={ariaRowindex}
          checked={Object.keys(selectedEventIds).includes(id)}
          columnValues={columnValues}
          onRowSelected={onRowSelected}
          data-test-subj="actions"
          eventId={id}
          loadingEventIds={loadingEventIds}
          onEventDetailsPanelOpened={onEventDetailsPanelOpened}
          showCheckboxes={showCheckboxes}
        />
        <DataDrivenColumns
          _id={id}
          ariaRowindex={ariaRowindex}
          columnHeaders={columnHeaders}
          columnRenderers={columnRenderers}
          data={data}
          ecsData={ecsData}
          hasRowRenderers={hasRowRenderers}
          notesCount={notesCount}
          tabType={tabType}
          timelineId={timelineId}
        />
      </EventsTrData>
    );
  }
);

EventColumnView.displayName = 'EventColumnView';
