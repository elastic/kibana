/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { inputsModel } from '../../../../common/store';
import { BrowserFields, DocValueFields } from '../../../../common/containers/source';
import {
  TimelineItem,
  TimelineEventsDetailsItem,
  TimelineNonEcsData,
} from '../../../../../common/search_strategy';
import { Note } from '../../../../common/lib/note';
import { ColumnHeaderOptions } from '../../../../timelines/store/timeline/model';
import { AddNoteToEvent, UpdateNote } from '../../notes/helpers';
import {
  OnColumnRemoved,
  OnColumnResized,
  OnColumnSorted,
  OnPinEvent,
  OnRowSelected,
  OnSelectAll,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../events';
import { EventsTable, TimelineBody, TimelineBodyGlobalStyle } from '../styles';
import { ColumnHeaders } from './column_headers';
import { getActionsColumnWidth } from './column_headers/helpers';
import { Events } from './events';
import { ColumnRenderer } from './renderers/column_renderer';
import { RowRenderer } from './renderers/row_renderer';
import { Sort } from './sort';
import { GraphOverlay } from '../../graph_overlay';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../helpers';
import { TimelineEventsType, TimelineId, TimelineType } from '../../../../../common/types/timeline';
import { ExpandableEvent } from '../expandable_event';
import { useTimelineEventsDetails } from '../../../containers/details';

export interface BodyProps {
  addNoteToEvent: AddNoteToEvent;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  data: TimelineItem[];
  docValueFields: DocValueFields[];
  getNotesByIds: (noteIds: string[]) => Note[];
  graphEventId?: string;
  isEventViewer?: boolean;
  isSelectAllChecked: boolean;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  eventType?: TimelineEventsType;
  loadingEventIds: Readonly<string[]>;
  onColumnRemoved: OnColumnRemoved;
  onColumnResized: OnColumnResized;
  onColumnSorted: OnColumnSorted;
  onRowSelected: OnRowSelected;
  onSelectAll: OnSelectAll;
  onPinEvent: OnPinEvent;
  onUpdateColumns: OnUpdateColumns;
  onUnPinEvent: OnUnPinEvent;
  pinnedEventIds: Readonly<Record<string, boolean>>;
  refetch: inputsModel.Refetch;
  onRuleChange?: () => void;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  show: boolean;
  showCheckboxes: boolean;
  sort: Sort;
  timelineId: string;
  timelineType: TimelineType;
  toggleColumn: (column: ColumnHeaderOptions) => void;
  updateNote: UpdateNote;
}

export const hasAdditionalActions = (id: TimelineId): boolean =>
  [TimelineId.detectionsPage, TimelineId.detectionsRulesDetailsPage, TimelineId.active].includes(
    id
  );

const EXTRA_WIDTH = 4; // px

const emptyDetails: TimelineEventsDetailsItem[] = [];

const FullWithFlexGroup = styled(EuiFlexGroup)`
  width: 100%;
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  overflow: auto;
`;

/** Renders the timeline body */
export const Body = React.memo<BodyProps>(
  ({
    addNoteToEvent,
    browserFields,
    columnHeaders,
    columnRenderers,
    data,
    docValueFields,
    eventIdToNoteIds,
    getNotesByIds,
    graphEventId,
    isEventViewer = false,
    isSelectAllChecked,
    loadingEventIds,
    onColumnRemoved,
    onColumnResized,
    onColumnSorted,
    onRowSelected,
    onSelectAll,
    onPinEvent,
    onUpdateColumns,
    onUnPinEvent,
    pinnedEventIds,
    rowRenderers,
    refetch,
    onRuleChange,
    selectedEventIds,
    show,
    showCheckboxes,
    sort,
    toggleColumn,
    timelineId,
    timelineType,
    updateNote,
  }) => {
    const [expanded, setExpanded] = useState<{ eventId?: string; indexName?: string }>({});
    const [loading, detailsData] = useTimelineEventsDetails({
      docValueFields,
      indexName: expanded.indexName!,
      eventId: expanded.eventId!,
      skip: !expanded.eventId,
    });

    const onEventToggled = useCallback((event) => {
      const eventId = event._id;

      setExpanded((currentExpanded) => {
        if (currentExpanded.eventId === eventId) {
          return {};
        }

        return { eventId, indexName: event._index };
      });
    }, []);

    const actionsColumnWidth = useMemo(
      () =>
        getActionsColumnWidth(
          isEventViewer,
          showCheckboxes,
          hasAdditionalActions(timelineId as TimelineId)
            ? DEFAULT_ICON_BUTTON_WIDTH + EXTRA_WIDTH
            : 0
        ),
      [isEventViewer, showCheckboxes, timelineId]
    );

    const columnWidths = useMemo(
      () =>
        columnHeaders.reduce((totalWidth, header) => totalWidth + header.width, actionsColumnWidth),
      [actionsColumnWidth, columnHeaders]
    );

    return (
      <>
        {graphEventId && (
          <GraphOverlay
            graphEventId={graphEventId}
            isEventViewer={isEventViewer}
            timelineId={timelineId}
            timelineType={timelineType}
          />
        )}
        <FullWithFlexGroup>
          <ScrollableFlexItem grow={2}>
            <div>
              <TimelineBody
                data-test-subj="timeline-body"
                data-timeline-id={timelineId}
                visible={show && !graphEventId}
              >
                <EventsTable data-test-subj="events-table" columnWidths={columnWidths}>
                  <ColumnHeaders
                    actionsColumnWidth={actionsColumnWidth}
                    browserFields={browserFields}
                    columnHeaders={columnHeaders}
                    isEventViewer={isEventViewer}
                    isSelectAllChecked={isSelectAllChecked}
                    onColumnRemoved={onColumnRemoved}
                    onColumnResized={onColumnResized}
                    onColumnSorted={onColumnSorted}
                    onSelectAll={onSelectAll}
                    onUpdateColumns={onUpdateColumns}
                    showEventsSelect={false}
                    showSelectAllCheckbox={showCheckboxes}
                    sort={sort}
                    timelineId={timelineId}
                    toggleColumn={toggleColumn}
                  />

                  <Events
                    actionsColumnWidth={actionsColumnWidth}
                    addNoteToEvent={addNoteToEvent}
                    browserFields={browserFields}
                    columnHeaders={columnHeaders}
                    columnRenderers={columnRenderers}
                    data={data}
                    expanded={expanded}
                    eventIdToNoteIds={eventIdToNoteIds}
                    getNotesByIds={getNotesByIds}
                    id={timelineId}
                    isEventViewer={isEventViewer}
                    loadingEventIds={loadingEventIds}
                    onColumnResized={onColumnResized}
                    onPinEvent={onPinEvent}
                    onRowSelected={onRowSelected}
                    onUnPinEvent={onUnPinEvent}
                    onEventToggled={onEventToggled}
                    pinnedEventIds={pinnedEventIds}
                    refetch={refetch}
                    rowRenderers={rowRenderers}
                    onRuleChange={onRuleChange}
                    selectedEventIds={selectedEventIds}
                    showCheckboxes={showCheckboxes}
                    toggleColumn={toggleColumn}
                    updateNote={updateNote}
                  />
                </EventsTable>
              </TimelineBody>
            </div>
          </ScrollableFlexItem>
          <ScrollableFlexItem grow={1}>
            {expanded.eventId && (
              <ExpandableEvent
                browserFields={browserFields}
                columnHeaders={columnHeaders}
                event={detailsData || emptyDetails}
                forceExpand={!!expanded.eventId && !loading}
                id={expanded.eventId!}
                onUpdateColumns={onUpdateColumns}
                timelineId={timelineId}
                toggleColumn={toggleColumn}
              />
            )}
          </ScrollableFlexItem>
        </FullWithFlexGroup>
        <TimelineBodyGlobalStyle />
      </>
    );
  }
);
