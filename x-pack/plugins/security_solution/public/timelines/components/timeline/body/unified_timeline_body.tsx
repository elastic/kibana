/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps, ReactElement } from 'react';
import React, { useEffect, useState, useMemo } from 'react';
import { RootDragDropProvider } from '@kbn/dom-drag-drop';
import { isEmpty } from 'lodash';
import { StyledTableFlexGroup, StyledTableFlexItem } from '../unified_components/styles';
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
    onEventClosed,
    expandedDetail,
    showExpandedDetails,
    onChangePage,
    activeTab,
    updatedAt,
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

  const columnsHeader = useMemo(() => {
    return isEmpty(columns) ? defaultUdtHeaders : columns;
  }, [columns]);

  return (
    <StyledTableFlexGroup direction="column" gutterSize="s">
      <StyledTableFlexItem grow={false}>{header}</StyledTableFlexItem>
      <StyledTableFlexItem className="unifiedTimelineBody" data-test-subj="unifiedTimelineBody">
        <RootDragDropProvider>
          <UnifiedTimeline
            columns={columnsHeader}
            rowRenderers={rowRenderers}
            timelineId={timelineId}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={itemsPerPageOptions}
            sort={sort}
            events={rows}
            refetch={refetch}
            dataLoadingState={dataLoadingState}
            totalCount={totalCount}
            onEventClosed={onEventClosed}
            expandedDetail={expandedDetail}
            showExpandedDetails={showExpandedDetails}
            onChangePage={onChangePage}
            activeTab={activeTab}
            updatedAt={updatedAt}
            isTextBasedQuery={false}
          />
        </RootDragDropProvider>
      </StyledTableFlexItem>
    </StyledTableFlexGroup>
  );
};
