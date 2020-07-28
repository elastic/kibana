/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable as _EuiBasicTable } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import * as i18n from '../translations';
import {
  ActionTimelineToShow,
  DeleteTimelines,
  OnOpenTimeline,
  OnSelectionChange,
  OnTableChange,
  OnToggleShowNotes,
  OpenTimelineResult,
  EnableExportTimelineDownloader,
  OnOpenDeleteTimelineModal,
} from '../types';
import { getActionsColumns } from './actions_columns';
import { getCommonColumns } from './common_columns';
import { getExtendedColumns } from './extended_columns';
import { getIconHeaderColumns } from './icon_header_columns';
import { TimelineTypeLiteralWithNull } from '../../../../../common/types/timeline';

// there are a number of type mismatches across this file
const EuiBasicTable: any = _EuiBasicTable; // eslint-disable-line @typescript-eslint/no-explicit-any

const BasicTable = styled(EuiBasicTable)`
  .euiTableCellContent {
    animation: none; /* Prevents applying max-height from animation */
  }

  .euiTableRow-isExpandedRow .euiTableCellContent__text {
    width: 100%; /* Fixes collapsing nested flex content in IE11 */
  }
`;
BasicTable.displayName = 'BasicTable';

/**
 * Returns the column definitions (passed as the `columns` prop to
 * `EuiBasicTable`) that are displayed in the compact `Open Timeline` modal
 * view, and the full view shown in the `All Timelines` view of the
 * `Timelines` page
 */

export const getTimelinesTableColumns = ({
  actionTimelineToShow,
  deleteTimelines,
  enableExportTimelineDownloader,
  itemIdToExpandedNotesRowMap,
  onOpenDeleteTimelineModal,
  onOpenTimeline,
  onToggleShowNotes,
  showExtendedColumns,
  timelineType,
}: {
  actionTimelineToShow: ActionTimelineToShow[];
  deleteTimelines?: DeleteTimelines;
  enableExportTimelineDownloader?: EnableExportTimelineDownloader;
  itemIdToExpandedNotesRowMap: Record<string, JSX.Element>;
  onOpenDeleteTimelineModal?: OnOpenDeleteTimelineModal;
  onOpenTimeline: OnOpenTimeline;
  onSelectionChange: OnSelectionChange;
  onToggleShowNotes: OnToggleShowNotes;
  showExtendedColumns: boolean;
  timelineType: TimelineTypeLiteralWithNull;
}) => {
  return [
    ...getCommonColumns({
      itemIdToExpandedNotesRowMap,
      onOpenTimeline,
      onToggleShowNotes,
      timelineType,
    }),
    ...getExtendedColumns(showExtendedColumns),
    ...getIconHeaderColumns({ timelineType }),
    ...getActionsColumns({
      actionTimelineToShow,
      deleteTimelines,
      enableExportTimelineDownloader,
      onOpenDeleteTimelineModal,
      onOpenTimeline,
    }),
  ];
};

export interface TimelinesTableProps {
  actionTimelineToShow: ActionTimelineToShow[];
  deleteTimelines?: DeleteTimelines;
  defaultPageSize: number;
  loading: boolean;
  itemIdToExpandedNotesRowMap: Record<string, JSX.Element>;
  enableExportTimelineDownloader?: EnableExportTimelineDownloader;
  onOpenDeleteTimelineModal?: OnOpenDeleteTimelineModal;
  onOpenTimeline: OnOpenTimeline;
  onSelectionChange: OnSelectionChange;
  onTableChange: OnTableChange;
  onToggleShowNotes: OnToggleShowNotes;
  pageIndex: number;
  pageSize: number;
  searchResults: OpenTimelineResult[];
  showExtendedColumns: boolean;
  sortDirection: 'asc' | 'desc';
  sortField: string;
  timelineType: TimelineTypeLiteralWithNull;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tableRef?: React.MutableRefObject<_EuiBasicTable<any> | undefined>;
  totalSearchResultsCount: number;
}

/**
 * Renders a table that displays metadata about timelines, (i.e. name,
 * description, etc.)
 */
export const TimelinesTable = React.memo<TimelinesTableProps>(
  ({
    actionTimelineToShow,
    deleteTimelines,
    defaultPageSize,
    loading: isLoading,
    itemIdToExpandedNotesRowMap,
    enableExportTimelineDownloader,
    onOpenDeleteTimelineModal,
    onOpenTimeline,
    onSelectionChange,
    onTableChange,
    onToggleShowNotes,
    pageIndex,
    pageSize,
    searchResults,
    showExtendedColumns,
    sortField,
    sortDirection,
    tableRef,
    timelineType,
    totalSearchResultsCount,
  }) => {
    const pagination = {
      hidePerPageOptions: !showExtendedColumns,
      pageIndex,
      pageSize,
      pageSizeOptions: [
        Math.floor(Math.max(defaultPageSize, 1) / 2),
        defaultPageSize,
        defaultPageSize * 2,
      ],
      totalItemCount: totalSearchResultsCount,
    };

    const sorting = {
      sort: {
        field: sortField as keyof OpenTimelineResult,
        direction: sortDirection,
      },
    };

    const selection = {
      selectable: (timelineResult: OpenTimelineResult) => timelineResult.savedObjectId != null,
      selectableMessage: (selectable: boolean) =>
        !selectable ? i18n.MISSING_SAVED_OBJECT_ID : undefined,
      onSelectionChange,
    };
    const basicTableProps = tableRef != null ? { ref: tableRef } : {};

    const columns = useMemo(
      () =>
        getTimelinesTableColumns({
          actionTimelineToShow,
          deleteTimelines,
          itemIdToExpandedNotesRowMap,
          enableExportTimelineDownloader,
          onOpenDeleteTimelineModal,
          onOpenTimeline,
          onSelectionChange,
          onToggleShowNotes,
          showExtendedColumns,
          timelineType,
        }),
      [
        actionTimelineToShow,
        deleteTimelines,
        itemIdToExpandedNotesRowMap,
        enableExportTimelineDownloader,
        onOpenDeleteTimelineModal,
        onOpenTimeline,
        onSelectionChange,
        onToggleShowNotes,
        showExtendedColumns,
        timelineType,
      ]
    );

    return (
      <BasicTable
        columns={columns}
        data-test-subj="timelines-table"
        isExpandable={true}
        isSelectable={actionTimelineToShow.includes('selectable')}
        itemId="savedObjectId"
        itemIdToExpandedRowMap={itemIdToExpandedNotesRowMap}
        items={searchResults}
        loading={isLoading}
        noItemsMessage={i18n.ZERO_TIMELINES_MATCH}
        onChange={onTableChange}
        pagination={pagination}
        selection={actionTimelineToShow.includes('selectable') ? selection : undefined}
        sorting={sorting}
        {...basicTableProps}
      />
    );
  }
);
TimelinesTable.displayName = 'TimelinesTable';
