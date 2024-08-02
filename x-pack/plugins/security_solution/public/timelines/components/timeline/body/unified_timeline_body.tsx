/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps, ReactElement } from 'react';
import React, { useEffect, useState, useMemo } from 'react';
import { RootDragDropProvider } from '@kbn/dom-drag-drop';
import { StyledTableFlexGroup, StyledUnifiedTableFlexItem } from '../unified_components/styles';
import { UnifiedTimeline } from '../unified_components';
import { defaultUdtHeaders } from '../unified_components/default_headers';
import type { PaginationInputPaginated, TimelineItem } from '../../../../../common/search_strategy';

export interface UnifiedTimelineBodyProps extends ComponentProps<typeof UnifiedTimeline> {
  header: ReactElement;
  pageInfo: Pick<PaginationInputPaginated, 'activePage' | 'querySize'>;
}

export const UnifiedTimelineBody = (props: UnifiedTimelineBodyProps) => {
  const {
    header,
    isSortEnabled,
    pageInfo,
    columns,
    rowRenderers,
    timelineId,
    itemsPerPage,
    itemsPerPageOptions,
    sort,
    events,
    refetch,
    dataLoadingState,
    totalCount,
    onChangePage,
    activeTab,
    updatedAt,
    trailingControlColumns,
    leadingControlColumns,
  } = props;

  const [pageRows, setPageRows] = useState<TimelineItem[][]>([]);

  const rows = useMemo(() => pageRows.flat(), [pageRows]);

  useEffect(() => {
    setPageRows((currentPageRows) => {
      if (pageInfo.activePage !== 0 && currentPageRows[pageInfo.activePage]?.length) {
        return currentPageRows;
      }
      const newPageRows = pageInfo.activePage === 0 ? [] : [...currentPageRows];
      newPageRows[pageInfo.activePage] = events;
      return newPageRows;
    });
  }, [events, pageInfo.activePage]);

  const columnsHeader = useMemo(() => columns ?? defaultUdtHeaders, [columns]);

  return (
    <StyledTableFlexGroup direction="column" gutterSize="s">
      <StyledUnifiedTableFlexItem grow={false}>{header}</StyledUnifiedTableFlexItem>
      <StyledUnifiedTableFlexItem
        className="unifiedTimelineBody"
        data-test-subj="unifiedTimelineBody"
      >
        <RootDragDropProvider>
          <UnifiedTimeline
            columns={columnsHeader}
            rowRenderers={rowRenderers}
            isSortEnabled={isSortEnabled}
            timelineId={timelineId}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={itemsPerPageOptions}
            sort={sort}
            events={rows}
            refetch={refetch}
            dataLoadingState={dataLoadingState}
            totalCount={totalCount}
            onChangePage={onChangePage}
            activeTab={activeTab}
            updatedAt={updatedAt}
            isTextBasedQuery={false}
            trailingControlColumns={trailingControlColumns}
            leadingControlColumns={leadingControlColumns}
          />
        </RootDragDropProvider>
      </StyledUnifiedTableFlexItem>
    </StyledTableFlexGroup>
  );
};
