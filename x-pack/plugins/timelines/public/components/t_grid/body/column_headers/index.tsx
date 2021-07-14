/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGrid, EuiDataGridControlColumn } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import React, { useState, useEffect, useMemo } from 'react';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
// eslint-disable-next-line no-duplicate-imports
import type { ControlColumnProps, ColumnHeaderOptions } from '../../../../../common/types/timeline';

import type { BrowserFields } from '../../../../../common/search_strategy/index_fields';

import type { OnSelectAll } from '../../types';
import { Sort } from '../sort';
import { StatefulFieldsBrowser } from '../../contol_columns/fields_browser';
import {
  FIELD_BROWSER_HEIGHT,
  FIELD_BROWSER_WIDTH,
} from '../../contol_columns/fields_browser/helpers';

interface Props {
  actionsColumnWidth: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  isEventViewer?: boolean;
  isSelectAllChecked: boolean;
  onSelectAll: OnSelectAll;
  showEventsSelect: boolean;
  showSelectAllCheckbox: boolean;
  sort: Sort[];
  tabType: TimelineTabs;
  timelineId: string;
  leadingControlColumns: ControlColumnProps[];
  trailingControlColumns: ControlColumnProps[];
}

interface DraggableContainerProps {
  children: React.ReactNode;
  onMount: () => void;
  onUnmount: () => void;
}

export const DraggableContainer = React.memo<DraggableContainerProps>(
  ({ children, onMount, onUnmount }) => {
    useEffect(() => {
      onMount();

      return () => onUnmount();
    }, [onMount, onUnmount]);

    return <>{children}</>;
  }
);

DraggableContainer.displayName = 'DraggableContainer';

export const isFullScreen = ({
  globalFullScreen,
  timelineId,
  timelineFullScreen,
}: {
  globalFullScreen: boolean;
  timelineId: string;
  timelineFullScreen: boolean;
}) =>
  (timelineId === TimelineId.active && timelineFullScreen) ||
  (timelineId !== TimelineId.active && globalFullScreen);

/** Renders the timeline header columns */
export const ColumnHeadersComponent = ({
  actionsColumnWidth,
  browserFields,
  columnHeaders,
  isEventViewer = false,
  isSelectAllChecked,
  onSelectAll,
  showEventsSelect,
  showSelectAllCheckbox,
  sort,
  tabType,
  timelineId,
  leadingControlColumns,
  trailingControlColumns,
}: Props) => {
  // TODO: pass {data} parameter to the functions
  const leadingControls = useMemo(() => [], [
    // leadingControlColumns,
  ]) as EuiDataGridControlColumn[];
  const trailingControls = useMemo(() => [], [
    // trailingControlColumns,
  ]) as EuiDataGridControlColumn[];

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  useEffect(() => setVisibleColumns(columnHeaders.map(({ id }) => id)), [columnHeaders]);

  const columns = useMemo(
    () =>
      columnHeaders.map((column) => ({
        ...column,
        actions: { showHide: false },
      })),
    [columnHeaders]
  );

  return (
    <EuiDataGrid
      aria-label="header-data-grid"
      data-test-subj="header-data-grid"
      columnVisibility={{
        visibleColumns,
        setVisibleColumns,
      }}
      rowCount={0}
      renderCellValue={({ rowIndex, columnId }) => `${rowIndex}, ${columnId}`}
      columns={columns}
      toolbarVisibility={{
        showStyleSelector: true,
        showSortSelector: true,
        showFullScreenSelector: true,
        showColumnSelector: {
          allowHide: false,
          allowReorder: true,
        },
        additionalControls: (
          <StatefulFieldsBrowser
            data-test-subj="field-browser"
            height={FIELD_BROWSER_HEIGHT}
            width={FIELD_BROWSER_WIDTH}
            browserFields={browserFields}
            timelineId={timelineId}
            columnHeaders={columnHeaders}
          />
        ),
      }}
      leadingControlColumns={leadingControls}
      trailingControlColumns={trailingControls}
    />
  );
};

export const ColumnHeadersDummy = React.memo(
  ColumnHeadersComponent,
  (prevProps, nextProps) =>
    prevProps.actionsColumnWidth === nextProps.actionsColumnWidth &&
    prevProps.isEventViewer === nextProps.isEventViewer &&
    prevProps.isSelectAllChecked === nextProps.isSelectAllChecked &&
    prevProps.onSelectAll === nextProps.onSelectAll &&
    prevProps.showEventsSelect === nextProps.showEventsSelect &&
    prevProps.showSelectAllCheckbox === nextProps.showSelectAllCheckbox &&
    deepEqual(prevProps.sort, nextProps.sort) &&
    prevProps.timelineId === nextProps.timelineId &&
    deepEqual(prevProps.columnHeaders, nextProps.columnHeaders) &&
    prevProps.tabType === nextProps.tabType &&
    deepEqual(prevProps.browserFields, nextProps.browserFields)
);
