/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';

import { inputsModel } from '../../../../common/store';
import { BrowserFields, DocValueFields } from '../../../../common/containers/source';
import { TimelineItem, TimelineNonEcsData } from '../../../../../common/search_strategy';
import { ColumnHeaderOptions } from '../../../store/timeline/model';
import { OnRowSelected, OnSelectAll } from '../events';
import { EventsTable, TimelineBody, TimelineBodyGlobalStyle } from '../styles';
import { ColumnHeaders } from './column_headers';
import { getActionsColumnWidth } from './column_headers/helpers';
import { Events } from './events';
import { ColumnRenderer } from './renderers/column_renderer';
import { RowRenderer } from './renderers/row_renderer';
import { Sort } from './sort';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../helpers';
import { TimelineEventsType, TimelineId } from '../../../../../common/types/timeline';

export interface BodyProps {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  data: TimelineItem[];
  docValueFields: DocValueFields[];
  graphEventId?: string;
  isEventViewer?: boolean;
  isSelectAllChecked: boolean;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  eventType?: TimelineEventsType;
  loadingEventIds: Readonly<string[]>;
  onRowSelected: OnRowSelected;
  onSelectAll: OnSelectAll;
  pinnedEventIds: Readonly<Record<string, boolean>>;
  refetch: inputsModel.Refetch;
  onRuleChange?: () => void;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  show: boolean;
  showCheckboxes: boolean;
  sort: Sort;
  timelineId: string;
}

export const hasAdditionalActions = (id: TimelineId): boolean =>
  [TimelineId.detectionsPage, TimelineId.detectionsRulesDetailsPage, TimelineId.active].includes(
    id
  );

const EXTRA_WIDTH = 4; // px

/** Renders the timeline body */
export const Body = React.memo<BodyProps>(
  ({
    browserFields,
    columnHeaders,
    columnRenderers,
    data,
    eventIdToNoteIds,
    graphEventId,
    isEventViewer = false,
    isSelectAllChecked,
    loadingEventIds,
    onRowSelected,
    onSelectAll,
    pinnedEventIds,
    rowRenderers,
    refetch,
    onRuleChange,
    selectedEventIds,
    show,
    showCheckboxes,
    sort,
    timelineId,
  }) => {
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
              onSelectAll={onSelectAll}
              showEventsSelect={false}
              showSelectAllCheckbox={showCheckboxes}
              sort={sort}
              timelineId={timelineId}
            />

            <Events
              actionsColumnWidth={actionsColumnWidth}
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              columnRenderers={columnRenderers}
              data={data}
              eventIdToNoteIds={eventIdToNoteIds}
              id={timelineId}
              isEventViewer={isEventViewer}
              loadingEventIds={loadingEventIds}
              onRowSelected={onRowSelected}
              pinnedEventIds={pinnedEventIds}
              refetch={refetch}
              rowRenderers={rowRenderers}
              onRuleChange={onRuleChange}
              selectedEventIds={selectedEventIds}
              showCheckboxes={showCheckboxes}
            />
          </EventsTable>
        </TimelineBody>
        <TimelineBodyGlobalStyle />
      </>
    );
  }
);

Body.displayName = 'Body';
