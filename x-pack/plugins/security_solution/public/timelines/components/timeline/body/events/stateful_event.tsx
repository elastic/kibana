/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { PropsWithChildren } from 'react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { isEventBuildingBlockType } from '@kbn/securitysolution-data-table';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DocumentDetailsRightPanelKey } from '../../../../../flyout/document_details/shared/constants/panel_keys';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { useKibana } from '../../../../../common/lib/kibana';
import type {
  ColumnHeaderOptions,
  CellValueElementProps,
  RowRenderer,
  TimelineTabs,
} from '../../../../../../common/types/timeline';
import type {
  TimelineItem,
  TimelineNonEcsData,
} from '../../../../../../common/search_strategy/timeline';
import type { OnRowSelected } from '../../events';
import { STATEFUL_EVENT_CSS_CLASS_NAME } from '../../helpers';
import { EventsTrGroup, EventsTrSupplement, EventsTrSupplementContainer } from '../../styles';
import { getEventType, isEvenEqlSequence } from '../helpers';
import { useEventDetailsWidthContext } from '../../../../../common/components/events_viewer/event_details_width_context';
import { EventColumnView } from './event_column_view';
import type { inputsModel } from '../../../../../common/store';
import { appSelectors } from '../../../../../common/store';
import { timelineActions } from '../../../../store';
import type { TimelineResultNote } from '../../../open_timeline/types';
import { getRowRenderer } from '../renderers/get_row_renderer';
import { StatefulRowRenderer } from './stateful_row_renderer';
import { NOTES_BUTTON_CLASS_NAME } from '../../properties/helpers';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import type {
  ControlColumnProps,
  SetEventsDeleted,
  SetEventsLoading,
} from '../../../../../../common/types';

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
  onToggleShowNotes?: (eventId?: string) => void;
}

const emptyNotes: string[] = [];

const EventsTrSupplementContainerWrapper = React.memo<PropsWithChildren<unknown>>(
  ({ children }) => {
    const width = useEventDetailsWidthContext();
    return <EventsTrSupplementContainer width={width}>{children}</EventsTrSupplementContainer>;
  }
);

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
  onToggleShowNotes,
}) => {
  const { telemetry } = useKibana().services;
  const trGroupRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch();

  const { openFlyout } = useExpandableFlyoutApi();

  // Store context in state rather than creating object in provider value={} to prevent re-renders caused by a new object being created
  const [activeStatefulEventContext] = useState({
    timelineID: timelineId,
    enableHostDetailsFlyout: true,
    enableIpDetailsFlyout: true,
    tabType,
  });

  const [, setFocusedNotes] = useState<{ [eventId: string]: boolean }>({});

  const eventId = event._id;

  const isDetailPanelExpanded: boolean = false;

  const getNotesByIds = useMemo(() => appSelectors.notesByIdsSelector(), []);
  const notesById = useDeepEqualSelector(getNotesByIds);
  const noteIds: string[] = eventIdToNoteIds[eventId] || emptyNotes;

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
    () => getRowRenderer({ data: event.ecs, rowRenderers }) != null,
    [event.ecs, rowRenderers]
  );

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const indexName = event._index!;

  const onToggleShowNotesHandler = useCallback(
    (currentEventId?: string) => {
      onToggleShowNotes?.(currentEventId);
      setFocusedNotes((prevShowNotes) => {
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
    },
    [onToggleShowNotes, eventId]
  );

  const handleOnEventDetailPanelOpened = useCallback(() => {
    openFlyout({
      right: {
        id: DocumentDetailsRightPanelKey,
        params: {
          id: eventId,
          indexName,
          scopeId: timelineId,
        },
      },
    });
    telemetry.reportDetailsFlyoutOpened({
      location: timelineId,
      panel: 'right',
    });
  }, [eventId, indexName, openFlyout, timelineId, telemetry]);

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
          id={eventId}
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
          showNotes={true}
          tabType={tabType}
          timelineId={timelineId}
          toggleShowNotes={onToggleShowNotesHandler}
          leadingControlColumns={leadingControlColumns}
          trailingControlColumns={trailingControlColumns}
          setEventsLoading={setEventsLoading}
          setEventsDeleted={setEventsDeleted}
        />

        <EventsTrSupplementContainerWrapper>
          <EuiFlexGroup gutterSize="none" justifyContent="center">
            <EuiFlexItem grow={false}>
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
            </EuiFlexItem>
          </EuiFlexGroup>
        </EventsTrSupplementContainerWrapper>
      </EventsTrGroup>
    </StatefulEventContext.Provider>
  );
};

export const StatefulEvent = React.memo(StatefulEventComponent);
