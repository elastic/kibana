/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEmpty } from 'lodash';

import { EventsTbody } from '../../styles';
import { StatefulEvent } from './stateful_event';
import type { BrowserFields } from '../../../../../common/search_strategy/index_fields';
import { TimelineTabs } from '../../../../../common/types/timeline';
import type {
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  OnRowSelected,
  RowRenderer,
} from '../../../../../common/types/timeline';

import { TimelineItem, TimelineNonEcsData } from '../../../../../common/search_strategy';

/** This offset begins at two, because the header row counts as "row 1", and aria-rowindex starts at "1" */
const ARIA_ROW_INDEX_OFFSET = 2;

interface Props {
  actionsColumnWidth: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  data: TimelineItem[];
  id: string;
  isEventViewer?: boolean;
  lastFocusedAriaColindex: number;
  loadingEventIds: Readonly<string[]>;
  onRowSelected: OnRowSelected;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  onRuleChange?: () => void;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  tabType?: TimelineTabs;
  leadingControlColumns: ControlColumnProps[];
  trailingControlColumns: ControlColumnProps[];
}

const EventsComponent: React.FC<Props> = ({
  actionsColumnWidth,
  browserFields,
  columnHeaders,
  containerRef,
  data,
  id,
  isEventViewer = false,
  lastFocusedAriaColindex,
  loadingEventIds,
  onRowSelected,
  onRuleChange,
  renderCellValue,
  rowRenderers,
  selectedEventIds,
  showCheckboxes,
  tabType,
  leadingControlColumns,
  trailingControlColumns,
}) => (
  <EventsTbody data-test-subj="events">
    {data.map((event, i) => (
      <StatefulEvent
        actionsColumnWidth={actionsColumnWidth}
        ariaRowindex={i + ARIA_ROW_INDEX_OFFSET}
        browserFields={browserFields}
        columnHeaders={columnHeaders}
        containerRef={containerRef}
        event={event}
        isEventViewer={isEventViewer}
        key={`${id}_${tabType}_${event._id}_${event._index}_${
          !isEmpty(event.ecs.eql?.sequenceNumber) ? event.ecs.eql?.sequenceNumber : ''
        }`}
        lastFocusedAriaColindex={lastFocusedAriaColindex}
        loadingEventIds={loadingEventIds}
        onRowSelected={onRowSelected}
        renderCellValue={renderCellValue}
        rowRenderers={rowRenderers}
        onRuleChange={onRuleChange}
        selectedEventIds={selectedEventIds}
        showCheckboxes={showCheckboxes}
        tabType={tabType}
        timelineId={id}
        leadingControlColumns={leadingControlColumns}
        trailingControlColumns={trailingControlColumns}
      />
    ))}
  </EventsTbody>
);

export const Events = React.memo(EventsComponent);
