/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { TimelineItem, TimelineNonEcsData } from '../../../../../common/search_strategy';
import type {
  ColumnHeaderOptions,
  ControlColumnProps,
  OnRowSelected,
  SetEventsLoading,
  SetEventsDeleted,
  TimelineExpandedDetailType,
} from '../../../../../common/types/timeline';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { getMappedNonEcsValue } from '../data_driven_columns';
import { tGridActions } from '../../../../store/t_grid';

type Props = EuiDataGridCellValueElementProps & {
  columnHeaders: ColumnHeaderOptions[];
  controlColumn: ControlColumnProps;
  data: TimelineItem[];
  disabled: boolean;
  index: number;
  isEventViewer: boolean;
  loadingEventIds: Readonly<string[]>;
  onRowSelected: OnRowSelected;
  onRuleChange?: () => void;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  tabType?: TimelineTabs;
  timelineId: string;
  width: number;
  setEventsLoading: SetEventsLoading;
  setEventsDeleted: SetEventsDeleted;
  pageRowIndex: number;
};

const RowActionComponent = ({
  columnHeaders,
  controlColumn,
  data,
  disabled,
  index,
  isEventViewer,
  loadingEventIds,
  onRowSelected,
  onRuleChange,
  pageRowIndex,
  rowIndex,
  selectedEventIds,
  showCheckboxes,
  tabType,
  timelineId,
  setEventsLoading,
  setEventsDeleted,
  width,
}: Props) => {
  const {
    data: timelineNonEcsData,
    ecs: ecsData,
    _id: eventId,
    _index: indexName,
  } = useMemo(() => {
    const rowData: Partial<TimelineItem> = data[pageRowIndex];
    return rowData ?? {};
  }, [data, pageRowIndex]);

  const dispatch = useDispatch();

  const columnValues = useMemo(
    () =>
      timelineNonEcsData &&
      columnHeaders
        .map(
          (header) =>
            getMappedNonEcsValue({
              data: timelineNonEcsData,
              fieldName: header.id,
            }) ?? []
        )
        .join(' '),
    [columnHeaders, timelineNonEcsData]
  );

  const handleOnEventDetailPanelOpened = useCallback(() => {
    const updatedExpandedDetail: TimelineExpandedDetailType = {
      panelView: 'eventDetail',
      params: {
        eventId: eventId ?? '',
        indexName: indexName ?? '',
      },
    };

    dispatch(
      tGridActions.toggleDetailPanel({
        ...updatedExpandedDetail,
        tabType,
        timelineId,
      })
    );
  }, [dispatch, eventId, indexName, tabType, timelineId]);

  const Action = controlColumn.rowCellRender;

  if (!timelineNonEcsData || !ecsData || !eventId) {
    return <span data-test-subj="noData" />;
  }

  return (
    <>
      {Action && (
        <Action
          ariaRowindex={pageRowIndex + 1}
          checked={Object.keys(selectedEventIds).includes(eventId)}
          columnId={controlColumn.id || ''}
          columnValues={columnValues || ''}
          data={timelineNonEcsData}
          data-test-subj="actions"
          disabled={disabled}
          ecsData={ecsData}
          eventId={eventId}
          index={index}
          isEventViewer={isEventViewer}
          loadingEventIds={loadingEventIds}
          onEventDetailsPanelOpened={handleOnEventDetailPanelOpened}
          onRowSelected={onRowSelected}
          onRuleChange={onRuleChange}
          rowIndex={rowIndex}
          showCheckboxes={showCheckboxes}
          tabType={tabType}
          timelineId={timelineId}
          width={width}
          setEventsLoading={setEventsLoading}
          setEventsDeleted={setEventsDeleted}
        />
      )}
    </>
  );
};

export const RowAction = React.memo(RowActionComponent);
