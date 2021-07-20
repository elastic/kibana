/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { TimelineItem, TimelineNonEcsData } from '../../../../../common/search_strategy';
import {
  ColumnHeaderOptions,
  ControlColumnProps,
  OnRowSelected,
  TimelineExpandedDetailType,
  TimelineTabs,
} from '../../../../../common/types/timeline';
import { getMappedNonEcsValue } from '../data_driven_columns';
import { tGridActions } from '../../../../store/t_grid';

type Props = EuiDataGridCellValueElementProps & {
  columnHeaders: ColumnHeaderOptions[];
  controlColumn: ControlColumnProps;
  data: TimelineItem[];
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
};

const RowActionComponent = ({
  columnHeaders,
  controlColumn,
  data,
  index,
  isEventViewer,
  loadingEventIds,
  onRowSelected,
  onRuleChange,
  rowIndex,
  selectedEventIds,
  showCheckboxes,
  tabType,
  timelineId,
  width,
}: Props) => {
  const dispatch = useDispatch();

  const LeadingActions = useMemo(() => {
    if (data.length === 0 || rowIndex >= data.length) {
      return <span data-test-subj="noData" />;
    }

    const { data: timelineNonEcsData, ecs: ecsData, _id: eventId, _index: indexName } = data[
      rowIndex
    ];

    const handleOnEventDetailPanelOpened = () => {
      const updatedExpandedDetail: TimelineExpandedDetailType = {
        panelView: 'eventDetail',
        params: {
          eventId,
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
    };

    const columnValues = columnHeaders
      .map(
        (header) =>
          getMappedNonEcsValue({
            data: timelineNonEcsData,
            fieldName: header.id,
          }) ?? []
      )
      .join(' ');

    const Action = controlColumn.rowCellRender;

    return (
      <>
        {Action && (
          <Action
            ariaRowindex={rowIndex + 1}
            checked={Object.keys(selectedEventIds).includes(eventId)}
            columnId={controlColumn.id || ''}
            columnValues={columnValues}
            data={timelineNonEcsData}
            data-test-subj="actions"
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
          />
        )}
      </>
    );
  }, [
    columnHeaders,
    controlColumn.id,
    controlColumn.rowCellRender,
    data,
    dispatch,
    index,
    isEventViewer,
    loadingEventIds,
    onRowSelected,
    onRuleChange,
    rowIndex,
    selectedEventIds,
    showCheckboxes,
    tabType,
    timelineId,
    width,
  ]);

  return <>{LeadingActions}</>;
};

export const RowAction = React.memo(RowActionComponent);
