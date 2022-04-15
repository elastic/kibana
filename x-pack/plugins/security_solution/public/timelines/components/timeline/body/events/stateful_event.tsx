/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import {
  ColumnHeaderOptions,
  CellValueElementProps,
  ControlColumnProps,
  RowRenderer,
  TimelineExpandedDetailType,
  TimelineId,
  TimelineTabs,
} from '../../../../../../common/types/timeline';
import type { SetEventsDeleted, SetEventsLoading } from '../../../../../../../timelines/common';
import {
  TimelineItem,
  TimelineNonEcsData,
} from '../../../../../../common/search_strategy/timeline';
import { OnRowSelected } from '../../events';
import { STATEFUL_EVENT_CSS_CLASS_NAME } from '../../helpers';
import { EventsTrGroup, EventsTrSupplement, EventsTrSupplementContainer } from '../../styles';
import { isEventBuildingBlockType, getEventType, isEvenEqlSequence } from '../helpers';
import { NoteCards } from '../../../notes/note_cards';
import { useEventDetailsWidthContext } from '../../../../../common/components/events_viewer/event_details_width_context';
import { EventColumnView } from './event_column_view';
import { appSelectors, inputsModel } from '../../../../../common/store';
import { timelineActions, timelineSelectors } from '../../../../store/timeline';
import { activeTimeline } from '../../../../containers/active_timeline_context';
import { TimelineResultNote } from '../../../open_timeline/types';
import { getRowRenderer } from '../renderers/get_row_renderer';
import { StatefulRowRenderer } from './stateful_row_renderer';
import { NOTES_BUTTON_CLASS_NAME } from '../../properties/helpers';
import { timelineDefaults } from '../../../../store/timeline/defaults';
import { useGetMappedNonEcsValue } from '../data_driven_columns';
import { StatefulEventContext } from '../../../../../../../timelines/public';

interface Props {
  actionsColumnWidth: number;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  columnHeaders: ColumnHeaderOptions[];
  event: TimelineItem;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  isEventViewer?: boolean;
  lastFocusedAriaColindex: number;
  loadingEventIds: Readonly<string[]>;
  onRowSelected: OnRowSelected;
  isEventPinned: boolean;
  refetch: inputsModel.Refetch;
  ariaRowindex: number;
  onRuleChange?: () => void;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  tabType?: TimelineTabs;
  timelineId: string;
  leadingControlColumns: ControlColumnProps[];
  trailingControlColumns: ControlColumnProps[];
}

const emptyNotes: string[] = [];

const EventsTrSupplementContainerWrapper = React.memo(({ children }) => {
  const width = useEventDetailsWidthContext();
  return <EventsTrSupplementContainer width={width}>{children}</EventsTrSupplementContainer>;
});

EventsTrSupplementContainerWrapper.displayName = 'EventsTrSupplementContainerWrapper';

const StatefulEventComponent: React.FC<Props> = ({
  actionsColumnWidth,
  containerRef,
  columnHeaders,
  event,
  eventIdToNoteIds,
  isEventViewer = false,
  isEventPinned = false,
  lastFocusedAriaColindex,
  loadingEventIds,
  onRowSelected,
  refetch,
  renderCellValue,
  rowRenderers,
  onRuleChange,
  ariaRowindex,
  selectedEventIds,
  showCheckboxes,
  tabType,
  timelineId,
  leadingControlColumns,
  trailingControlColumns,
}) => {
  const trGroupRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch();
  // Store context in state rather than creating object in provider value={} to prevent re-renders caused by a new object being created
  const [activeStatefulEventContext] = useState({
    timelineID: timelineId,
    enableHostDetailsFlyout: true,
    enableIpDetailsFlyout: true,
    tabType,
  });

  const [showNotes, setShowNotes] = useState<{ [eventId: string]: boolean }>({});
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const expandedDetail = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).expandedDetail ?? {}
  );
  const hostNameArr = useGetMappedNonEcsValue({ data: event?.data, fieldName: 'host.name' });

  const hostName = useMemo(() => {
    return hostNameArr && hostNameArr.length > 0 ? hostNameArr[0] : null;
  }, [hostNameArr]);
  const hostIpList = useGetMappedNonEcsValue({ data: event?.data, fieldName: 'host.ip' });
  const sourceIpList = useGetMappedNonEcsValue({ data: event?.data, fieldName: 'source.ip' });
  const destinationIpList = useGetMappedNonEcsValue({
    data: event?.data,
    fieldName: 'destination.ip',
  });
  const hostIPAddresses = useMemo(() => {
    const hostIps = hostIpList ?? [];
    const sourceIps = sourceIpList ?? [];
    const destinationIps = destinationIpList ?? [];
    return new Set([...hostIps, ...sourceIps, ...destinationIps]);
  }, [destinationIpList, sourceIpList, hostIpList]);

  const activeTab = tabType ?? TimelineTabs.query;
  const activeExpandedDetail = expandedDetail[activeTab];

  const isDetailPanelExpanded: boolean =
    (activeExpandedDetail?.panelView === 'eventDetail' &&
      activeExpandedDetail?.params?.eventId === event._id) ||
    (activeExpandedDetail?.panelView === 'hostDetail' &&
      activeExpandedDetail?.params?.hostName === hostName) ||
    (activeExpandedDetail?.panelView === 'networkDetail' &&
      activeExpandedDetail?.params?.ip &&
      hostIPAddresses?.has(activeExpandedDetail?.params?.ip)) ||
    false;

  const getNotesByIds = useMemo(() => appSelectors.notesByIdsSelector(), []);
  const notesById = useDeepEqualSelector(getNotesByIds);
  const noteIds: string[] = eventIdToNoteIds[event._id] || emptyNotes;

  const notes: TimelineResultNote[] = useMemo(
    () =>
      appSelectors.getNotes(notesById, noteIds).map((note) => ({
        savedObjectId: note.saveObjectId,
        note: note.note,
        noteId: note.id,
        updated: (note.lastEdit ?? note.created).getTime(),
        updatedBy: note.user,
      })),
    [notesById, noteIds]
  );

  const hasRowRenderers: boolean = useMemo(
    () => getRowRenderer(event.ecs, rowRenderers) != null,
    [event.ecs, rowRenderers]
  );

  const onToggleShowNotes = useCallback(() => {
    const eventId = event._id;

    setShowNotes((prevShowNotes) => {
      if (prevShowNotes[eventId]) {
        // notes are closing, so focus the notes button on the next tick, after escaping the EuiFocusTrap
        setTimeout(() => {
          const notesButtonElement = trGroupRef.current?.querySelector<HTMLButtonElement>(
            `.${NOTES_BUTTON_CLASS_NAME}`
          );
          notesButtonElement?.focus();
        }, 0);
      }

      return { ...prevShowNotes, [eventId]: !prevShowNotes[eventId] };
    });
  }, [event]);

  const handleOnEventDetailPanelOpened = useCallback(() => {
    const eventId = event._id;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const indexName = event._index!;

    const updatedExpandedDetail: TimelineExpandedDetailType = {
      panelView: 'eventDetail',
      params: {
        eventId,
        indexName,
        refetch,
      },
    };

    dispatch(
      timelineActions.toggleDetailPanel({
        ...updatedExpandedDetail,
        tabType,
        timelineId,
      })
    );

    if (timelineId === TimelineId.active && tabType === TimelineTabs.query) {
      activeTimeline.toggleExpandedDetail({ ...updatedExpandedDetail });
    }
  }, [dispatch, event._id, event._index, refetch, tabType, timelineId]);

  const associateNote = useCallback(
    (noteId: string) => {
      dispatch(timelineActions.addNoteToEvent({ eventId: event._id, id: timelineId, noteId }));
      if (!isEventPinned) {
        dispatch(timelineActions.pinEvent({ id: timelineId, eventId: event._id }));
      }
    },
    [dispatch, event, isEventPinned, timelineId]
  );

  const setEventsLoading = useCallback<SetEventsLoading>(
    ({ eventIds, isLoading }) => {
      dispatch(timelineActions.setEventsLoading({ id: timelineId, eventIds, isLoading }));
    },
    [dispatch, timelineId]
  );

  const setEventsDeleted = useCallback<SetEventsDeleted>(
    ({ eventIds, isDeleted }) => {
      dispatch(timelineActions.setEventsDeleted({ id: timelineId, eventIds, isDeleted }));
    },
    [dispatch, timelineId]
  );

  return (
    <StatefulEventContext.Provider value={activeStatefulEventContext}>
      <EventsTrGroup
        $ariaRowindex={ariaRowindex}
        className={STATEFUL_EVENT_CSS_CLASS_NAME}
        data-test-subj="event"
        eventType={getEventType(event.ecs)}
        isBuildingBlockType={isEventBuildingBlockType(event.ecs)}
        isEvenEqlSequence={isEvenEqlSequence(event.ecs)}
        isExpanded={isDetailPanelExpanded}
        ref={trGroupRef}
        showLeftBorder={!isEventViewer}
      >
        <EventColumnView
          id={event._id}
          actionsColumnWidth={actionsColumnWidth}
          ariaRowindex={ariaRowindex}
          columnHeaders={columnHeaders}
          data={event.data}
          ecsData={event.ecs}
          eventIdToNoteIds={eventIdToNoteIds}
          hasRowRenderers={hasRowRenderers}
          isEventPinned={isEventPinned}
          isEventViewer={isEventViewer}
          loadingEventIds={loadingEventIds}
          notesCount={notes.length}
          onEventDetailsPanelOpened={handleOnEventDetailPanelOpened}
          onRowSelected={onRowSelected}
          refetch={refetch}
          renderCellValue={renderCellValue}
          onRuleChange={onRuleChange}
          selectedEventIds={selectedEventIds}
          showCheckboxes={showCheckboxes}
          showNotes={!!showNotes[event._id]}
          tabType={tabType}
          timelineId={timelineId}
          toggleShowNotes={onToggleShowNotes}
          leadingControlColumns={leadingControlColumns}
          trailingControlColumns={trailingControlColumns}
          setEventsLoading={setEventsLoading}
          setEventsDeleted={setEventsDeleted}
        />

        <EventsTrSupplementContainerWrapper>
          <EventsTrSupplement
            className="siemEventsTable__trSupplement--notes"
            data-test-subj="event-notes-flex-item"
          >
            <NoteCards
              ariaRowindex={ariaRowindex}
              associateNote={associateNote}
              data-test-subj="note-cards"
              notes={notes}
              showAddNote={!!showNotes[event._id]}
              toggleShowAddNote={onToggleShowNotes}
            />
          </EventsTrSupplement>

          <EventsTrSupplement>
            <StatefulRowRenderer
              ariaRowindex={ariaRowindex}
              containerRef={containerRef}
              event={event}
              lastFocusedAriaColindex={lastFocusedAriaColindex}
              rowRenderers={rowRenderers}
              timelineId={timelineId}
            />
          </EventsTrSupplement>
        </EventsTrSupplementContainerWrapper>
      </EventsTrGroup>
    </StatefulEventContext.Provider>
  );
};

export const StatefulEvent = React.memo(StatefulEventComponent);
