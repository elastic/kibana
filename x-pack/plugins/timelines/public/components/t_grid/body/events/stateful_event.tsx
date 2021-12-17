/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { STATEFUL_EVENT_CSS_CLASS_NAME } from '../../helpers';
import { EventsTrGroup, EventsTrSupplement } from '../../styles';
import type { OnRowSelected } from '../../types';
import { isEventBuildingBlockType, getEventType, isEvenEqlSequence } from '../helpers';
import { EventColumnView } from './event_column_view';
import { getRowRenderer } from '../renderers/get_row_renderer';
import { StatefulRowRenderer } from './stateful_row_renderer';
import { getMappedNonEcsValue } from '../data_driven_columns';
import { StatefulEventContext } from './stateful_event_context';
import type { BrowserFields } from '../../../../../common/search_strategy/index_fields';
import {
  SetEventsDeleted,
  SetEventsLoading,
  TimelineTabs,
} from '../../../../../common/types/timeline';
import type {
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  RowRenderer,
  TimelineExpandedDetailType,
} from '../../../../../common/types/timeline';

import type { TimelineItem, TimelineNonEcsData } from '../../../../../common/search_strategy';
import { tGridActions, tGridSelectors } from '../../../../store/t_grid';
import { useDeepEqualSelector } from '../../../../hooks/use_selector';

interface Props {
  actionsColumnWidth: number;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  event: TimelineItem;
  isEventViewer?: boolean;
  lastFocusedAriaColindex: number;
  loadingEventIds: Readonly<string[]>;
  onRowSelected: OnRowSelected;
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

const StatefulEventComponent: React.FC<Props> = ({
  actionsColumnWidth,
  browserFields,
  containerRef,
  columnHeaders,
  event,
  isEventViewer = false,
  lastFocusedAriaColindex,
  loadingEventIds,
  onRowSelected,
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
  const [activeStatefulEventContext] = useState({ timelineID: timelineId, tabType });
  const getTGrid = useMemo(() => tGridSelectors.getTGridByIdSelector(), []);
  const expandedDetail = useDeepEqualSelector(
    (state) => getTGrid(state, timelineId).expandedDetail ?? {}
  );
  const hostName = useMemo(() => {
    const hostNameArr = getMappedNonEcsValue({ data: event?.data, fieldName: 'host.name' });
    return hostNameArr && hostNameArr.length > 0 ? hostNameArr[0] : null;
  }, [event?.data]);

  const hostIPAddresses = useMemo(() => {
    const hostIpList = getMappedNonEcsValue({ data: event?.data, fieldName: 'host.ip' }) ?? [];
    const sourceIpList = getMappedNonEcsValue({ data: event?.data, fieldName: 'source.ip' }) ?? [];
    const destinationIpList =
      getMappedNonEcsValue({
        data: event?.data,
        fieldName: 'destination.ip',
      }) ?? [];
    return new Set([...hostIpList, ...sourceIpList, ...destinationIpList]);
  }, [event?.data]);

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

  const hasRowRenderers: boolean = useMemo(
    () => getRowRenderer(event.ecs, rowRenderers) != null,
    [event.ecs, rowRenderers]
  );

  const handleOnEventDetailPanelOpened = useCallback(() => {
    const eventId = event._id;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const indexName = event._index!;

    const updatedExpandedDetail: TimelineExpandedDetailType = {
      panelView: 'eventDetail',
      params: {
        eventId,
        indexName,
      },
    };

    dispatch(
      tGridActions.toggleDetailPanel({
        ...updatedExpandedDetail,
        tabType,
        timelineId,
      })
    );
  }, [dispatch, event._id, event._index, tabType, timelineId]);

  const setEventsLoading = useCallback<SetEventsLoading>(
    ({ eventIds, isLoading }) => {
      dispatch(tGridActions.setEventsLoading({ id: timelineId, eventIds, isLoading }));
    },
    [dispatch, timelineId]
  );

  const setEventsDeleted = useCallback<SetEventsDeleted>(
    ({ eventIds, isDeleted }) => {
      dispatch(tGridActions.setEventsDeleted({ id: timelineId, eventIds, isDeleted }));
    },
    [dispatch, timelineId]
  );

  const RowRendererContent = useMemo(
    () => (
      <EventsTrSupplement>
        <StatefulRowRenderer
          ariaRowindex={ariaRowindex}
          browserFields={browserFields}
          containerRef={containerRef}
          event={event}
          lastFocusedAriaColindex={lastFocusedAriaColindex}
          rowRenderers={rowRenderers}
          timelineId={timelineId}
        />
      </EventsTrSupplement>
    ),
    [
      ariaRowindex,
      browserFields,
      containerRef,
      event,
      lastFocusedAriaColindex,
      rowRenderers,
      timelineId,
    ]
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
          hasRowRenderers={hasRowRenderers}
          isEventViewer={isEventViewer}
          loadingEventIds={loadingEventIds}
          onEventDetailsPanelOpened={handleOnEventDetailPanelOpened}
          onRowSelected={onRowSelected}
          renderCellValue={renderCellValue}
          onRuleChange={onRuleChange}
          selectedEventIds={selectedEventIds}
          showCheckboxes={showCheckboxes}
          tabType={tabType}
          timelineId={timelineId}
          leadingControlColumns={leadingControlColumns}
          trailingControlColumns={trailingControlColumns}
          setEventsLoading={setEventsLoading}
          setEventsDeleted={setEventsDeleted}
        />

        <div>{RowRendererContent}</div>
      </EventsTrGroup>
    </StatefulEventContext.Provider>
  );
};

export const StatefulEvent = React.memo(StatefulEventComponent);
