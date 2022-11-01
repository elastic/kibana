/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldBrowserOptions } from '@kbn/triggers-actions-ui-plugin/public';
import type { EuiDataGridCellValueElementProps, EuiDataGridControlColumn } from '@elastic/eui';
import type { ComponentType } from 'react';
import React from 'react';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import type {
  BrowserFields,
  TimelineItem,
  TimelineNonEcsData,
} from '../../../../common/search_strategy';
import type { SetEventsDeleted, SetEventsLoading } from '../../../../common/types/bulk_actions';
import type {
  ColumnHeaderOptions,
  ControlColumnProps,
  OnRowSelected,
  OnSelectAll,
  SortColumnTable,
} from '../../../../common/types';
import { HeaderCheckBox, RowCheckBox } from './checkbox';
import { addBuildingBlockStyle } from '../data_table/helpers';
import { getPageRowIndex } from '../data_table/pagination';
import { RowAction } from './row_action';

export const checkBoxControlColumn: ControlColumnProps = {
  id: 'checkbox-control-column',
  width: 32,
  headerCellRender: HeaderCheckBox,
  rowCellRender: RowCheckBox,
};
const EmptyHeaderCellRender: ComponentType = () => null;

export const transformControlColumns = ({
  columnHeaders,
  controlColumns,
  data,
  fieldBrowserOptions,
  loadingEventIds,
  onRowSelected,
  onRuleChange,
  selectedEventIds,
  showCheckboxes,
  tabType,
  timelineId,
  isSelectAllChecked,
  onSelectPage,
  browserFields,
  pageSize,
  sort,
  theme,
  setEventsLoading,
  setEventsDeleted,
}: {
  columnHeaders: ColumnHeaderOptions[];
  controlColumns: ControlColumnProps[];
  data: TimelineItem[];
  disabledCellActions: string[];
  fieldBrowserOptions?: FieldBrowserOptions;
  loadingEventIds: string[];
  onRowSelected: OnRowSelected;
  onRuleChange?: () => void;
  selectedEventIds: Record<string, TimelineNonEcsData[]>;
  showCheckboxes: boolean;
  tabType: string;
  timelineId: string;
  isSelectAllChecked: boolean;
  browserFields: BrowserFields;
  onSelectPage: OnSelectAll;
  pageSize: number;
  sort: SortColumnTable[];
  theme: EuiTheme;
  setEventsLoading: SetEventsLoading;
  setEventsDeleted: SetEventsDeleted;
}): EuiDataGridControlColumn[] =>
  controlColumns.map(
    ({ id: columnId, headerCellRender = EmptyHeaderCellRender, rowCellRender, width }, i) => ({
      id: `${columnId}`,
      headerCellRender: () => {
        const HeaderActions = headerCellRender;
        return (
          <>
            {HeaderActions && (
              <HeaderActions
                width={width}
                browserFields={browserFields}
                fieldBrowserOptions={fieldBrowserOptions}
                columnHeaders={columnHeaders}
                isEventViewer={false}
                isSelectAllChecked={isSelectAllChecked}
                onSelectAll={onSelectPage}
                showEventsSelect={false}
                showSelectAllCheckbox={showCheckboxes}
                sort={sort}
                tabType={tabType}
                timelineId={timelineId}
              />
            )}
          </>
        );
      },
      rowCellRender: ({
        isDetails,
        isExpandable,
        isExpanded,
        rowIndex,
        colIndex,
        setCellProps,
      }: EuiDataGridCellValueElementProps) => {
        const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
        const rowData = data[pageRowIndex];

        if (rowData) {
          addBuildingBlockStyle(rowData.ecs, theme, setCellProps);
        } else {
          // disable the cell when it has no data
          setCellProps({ style: { display: 'none' } });
        }

        return (
          <RowAction
            columnId={columnId ?? ''}
            columnHeaders={columnHeaders}
            controlColumn={controlColumns[i]}
            data={data}
            disabled={false}
            index={i}
            isDetails={isDetails}
            isExpanded={isExpanded}
            isEventViewer={false}
            isExpandable={isExpandable}
            loadingEventIds={loadingEventIds}
            onRowSelected={onRowSelected}
            onRuleChange={onRuleChange}
            rowIndex={rowIndex}
            colIndex={colIndex}
            pageRowIndex={pageRowIndex}
            selectedEventIds={selectedEventIds}
            setCellProps={setCellProps}
            showCheckboxes={showCheckboxes}
            tabType={tabType}
            tableId={timelineId}
            width={width}
            setEventsLoading={setEventsLoading}
            setEventsDeleted={setEventsDeleted}
          />
        );
      },
      width,
    })
  );
