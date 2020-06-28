/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiModalBody, EuiModalHeader } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import styled from 'styled-components';

import { TimelineType } from '../../../../../common/types/timeline';

import { OpenTimelineProps, ActionTimelineToShow } from '../types';
import { SearchRow } from '../search_row';
import { TimelinesTable } from '../timelines_table';
import { TitleRow } from '../title_row';

export const HeaderContainer = styled.div`
  width: 100%;
`;

HeaderContainer.displayName = 'HeaderContainer';

export const OpenTimelineModalBody = memo<OpenTimelineProps>(
  ({
    deleteTimelines,
    defaultPageSize,
    favoriteCount,
    hideActions = [],
    isLoading,
    itemIdToExpandedNotesRowMap,
    onAddTimelinesToFavorites,
    onDeleteSelected,
    onlyFavorites,
    onOpenTimeline,
    onQueryChange,
    onSelectionChange,
    onTableChange,
    onToggleOnlyFavorites,
    onToggleShowNotes,
    pageIndex,
    pageSize,
    query,
    searchResults,
    selectedItems,
    sortDirection,
    sortField,
    timelineFilter,
    timelineType,
    templateTimelineFilter,
    title,
    totalSearchResultsCount,
  }) => {
    const actionsToShow = useMemo(() => {
      const timelineResultsType = searchResults[0]?.timelineType;
      const actions: ActionTimelineToShow[] = [];

      if (onDeleteSelected != null && deleteTimelines != null) {
        actions.unshift('delete');
      }

      if (timelineResultsType === TimelineType.template) {
        actions.push('duplicateTemplate');
        actions.unshift('createTimelineFromTemplate');
      }

      if (timelineResultsType !== TimelineType.template) {
        actions.push('duplicate');
        actions.unshift('createTemplateFromTimeline');
      }

      return actions.filter((action) => !hideActions.includes(action));
    }, [onDeleteSelected, deleteTimelines, hideActions, searchResults]);

    const SearchRowContent = useMemo(
      () => (
        <>
          {!!timelineFilter && timelineFilter}
          {!!templateTimelineFilter && templateTimelineFilter}
        </>
      ),
      [timelineFilter, templateTimelineFilter]
    );

    return (
      <>
        <EuiModalHeader>
          <HeaderContainer>
            <TitleRow
              data-test-subj="title-row"
              onAddTimelinesToFavorites={onAddTimelinesToFavorites}
              selectedTimelinesCount={selectedItems.length}
              title={title}
            />
            <>
              <SearchRow
                data-test-subj="search-row"
                favoriteCount={favoriteCount}
                onlyFavorites={onlyFavorites}
                onQueryChange={onQueryChange}
                onToggleOnlyFavorites={onToggleOnlyFavorites}
                timelineType={timelineType}
              >
                {SearchRowContent}
              </SearchRow>
            </>
          </HeaderContainer>
        </EuiModalHeader>

        <EuiModalBody>
          <TimelinesTable
            actionTimelineToShow={actionsToShow}
            data-test-subj="timelines-table"
            deleteTimelines={deleteTimelines}
            defaultPageSize={defaultPageSize}
            loading={isLoading}
            itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
            onOpenTimeline={onOpenTimeline}
            onSelectionChange={onSelectionChange}
            onTableChange={onTableChange}
            onToggleShowNotes={onToggleShowNotes}
            pageIndex={pageIndex}
            pageSize={pageSize}
            searchResults={searchResults}
            showExtendedColumns={false}
            sortDirection={sortDirection}
            sortField={sortField}
            timelineType={timelineType}
            totalSearchResultsCount={totalSearchResultsCount}
          />
        </EuiModalBody>
      </>
    );
  }
);

OpenTimelineModalBody.displayName = 'OpenTimelineModalBody';
