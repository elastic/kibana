/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import {
  DeleteTimelines,
  OnOpenTimeline,
  OnSelectionChange,
  OnTableChange,
  OnToggleShowNotes,
  OpenTimelineResult,
} from '../types';
import { getActionsColumns } from './actions_columns';
import { getCommonColumns } from './common_columns';
import { getExtendedColumns } from './extended_columns';
import { getIconHeaderColumns } from './icon_header_columns';

import * as i18n from '../translations';

const TimelinesTableContainer = styled.div`
  .euiTableCellContent {
    animation: none;
    text-align: left;
  }

  .euiTableCellContent__text {
    width: 100%;
  }

  tbody {
    th,
    td {
      vertical-align: top;
    }
  }
`;

const getExtendedColumnsIfEnabled = (showExtendedColumnsAndActions: boolean) =>
  showExtendedColumnsAndActions ? [...getExtendedColumns()] : [];

/**
 * Returns the column definitions (passed as the `columns` prop to
 * `EuiBasicTable`) that are displayed in the compact `Open Timeline` modal
 * view, and the full view shown in the `All Timelines` view of the
 * `Timelines` page
 */
const getTimelinesTableColumns = ({
  deleteTimelines,
  itemIdToExpandedNotesRowMap,
  onOpenTimeline,
  onToggleShowNotes,
  showExtendedColumnsAndActions,
}: {
  deleteTimelines?: DeleteTimelines;
  itemIdToExpandedNotesRowMap: Record<string, JSX.Element>;
  onOpenTimeline: OnOpenTimeline;
  onToggleShowNotes: OnToggleShowNotes;
  showExtendedColumnsAndActions: boolean;
}) => [
  ...getCommonColumns({
    itemIdToExpandedNotesRowMap,
    onOpenTimeline,
    onToggleShowNotes,
    showExtendedColumnsAndActions,
  }),
  ...getExtendedColumnsIfEnabled(showExtendedColumnsAndActions),
  ...getIconHeaderColumns(),
  ...getActionsColumns({
    deleteTimelines,
    onOpenTimeline,
    showDeleteAction: showExtendedColumnsAndActions,
  }),
];

export interface TimelinesTableProps {
  deleteTimelines?: DeleteTimelines;
  defaultPageSize: number;
  loading: boolean;
  itemIdToExpandedNotesRowMap: Record<string, JSX.Element>;
  onOpenTimeline: OnOpenTimeline;
  onSelectionChange: OnSelectionChange;
  onTableChange: OnTableChange;
  onToggleShowNotes: OnToggleShowNotes;
  pageIndex: number;
  pageSize: number;
  searchResults: OpenTimelineResult[];
  showExtendedColumnsAndActions: boolean;
  sortDirection: 'asc' | 'desc';
  sortField: string;
  totalSearchResultsCount: number;
}

/**
 * Renders a table that displays metadata about timelines, (i.e. name,
 * description, etc.)
 */
export const TimelinesTable = pure<TimelinesTableProps>(
  ({
    deleteTimelines,
    defaultPageSize,
    loading: isLoading,
    itemIdToExpandedNotesRowMap,
    onOpenTimeline,
    onSelectionChange,
    onTableChange,
    onToggleShowNotes,
    pageIndex,
    pageSize,
    searchResults,
    showExtendedColumnsAndActions,
    sortField,
    sortDirection,
    totalSearchResultsCount,
  }) => {
    const pagination = {
      hidePerPageOptions: !showExtendedColumnsAndActions,
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
        field: sortField,
        direction: sortDirection,
      },
    };

    const selection = {
      selectable: (timelineResult: OpenTimelineResult) => timelineResult.savedObjectId != null,
      selectableMessage: (selectable: boolean) =>
        !selectable ? i18n.MISSING_SAVED_OBJECT_ID : undefined,
      onSelectionChange,
    };

    return (
      <TimelinesTableContainer data-test-subj="timelines-table-container">
        <EuiBasicTable
          compressed={true}
          columns={getTimelinesTableColumns({
            deleteTimelines,
            itemIdToExpandedNotesRowMap,
            onOpenTimeline,
            onToggleShowNotes,
            showExtendedColumnsAndActions,
          })}
          data-test-subj="timelines-table"
          isExpandable={true}
          isSelectable={showExtendedColumnsAndActions}
          itemId="savedObjectId"
          itemIdToExpandedRowMap={itemIdToExpandedNotesRowMap}
          items={searchResults}
          loading={isLoading}
          noItemsMessage={i18n.ZERO_TIMELINES_MATCH}
          onChange={onTableChange}
          pagination={pagination}
          selection={showExtendedColumnsAndActions ? selection : undefined}
          sorting={sorting}
        />
      </TimelinesTableContainer>
    );
  }
);
