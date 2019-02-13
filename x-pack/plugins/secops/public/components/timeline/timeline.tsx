/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getOr } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { StaticIndexPattern } from 'ui/index_patterns';
import { TimelineQuery } from '../../containers/timeline';
import { Direction } from '../../graphql/types';
import { Note } from '../../lib/note';
import { timelineModel } from '../../store';
import { AutoSizer } from '../auto_sizer';
import { AddNoteToEvent, UpdateNote } from '../notes/helpers';
import { Body } from './body';
import { ColumnHeader } from './body/column_headers/column_header';
import { ColumnRenderer } from './body/renderers';
import { RowRenderer } from './body/renderers';
import { Sort } from './body/sort';
import { DataProvider } from './data_providers/data_provider';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnChangeItemsPerPage,
  OnColumnSorted,
  OnDataProviderRemoved,
  OnFilterChange,
  OnPinEvent,
  OnRangeSelected,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
  OnUnPinEvent,
} from './events';
import { Footer, footerHeight } from './footer';
import { TimelineHeader } from './header/timeline_header';
import { calculateBodyHeight, combineQueries } from './helpers';

const WrappedByAutoSizer = styled.div`
  width: auto;
`; // required by AutoSizer

const TimelineContainer = styled.div`
  padding 0 5px 0 5px;
  user-select: none;
`;

interface Props {
  addNoteToEvent: AddNoteToEvent;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  dataProviders: DataProvider[];
  eventIdToNoteIds: { [eventId: string]: string[] };
  getNotesByIds: (noteIds: string[]) => Note[];
  flyoutHeaderHeight: number;
  flyoutHeight: number;
  id: string;
  indexPattern: StaticIndexPattern;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  kqlMode: timelineModel.KqlMode;
  kqlQuery: string;
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onChangeDroppableAndProvider: OnChangeDroppableAndProvider;
  onChangeItemsPerPage: OnChangeItemsPerPage;
  onColumnSorted: OnColumnSorted;
  onDataProviderRemoved: OnDataProviderRemoved;
  onFilterChange: OnFilterChange;
  onPinEvent: OnPinEvent;
  onRangeSelected: OnRangeSelected;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  onUnPinEvent: OnUnPinEvent;
  pinnedEventIds: { [eventId: string]: boolean };
  range: string;
  rowRenderers: RowRenderer[];
  show: boolean;
  sort: Sort;
  updateNote: UpdateNote;
}

/** The parent Timeline component */
export const Timeline = pure<Props>(
  ({
    addNoteToEvent,
    columnHeaders,
    columnRenderers,
    dataProviders,
    eventIdToNoteIds,
    getNotesByIds,
    flyoutHeaderHeight,
    flyoutHeight,
    id,
    indexPattern,
    itemsPerPage,
    itemsPerPageOptions,
    kqlMode,
    kqlQuery,
    onChangeDataProviderKqlQuery,
    onChangeDroppableAndProvider,
    onChangeItemsPerPage,
    onColumnSorted,
    onDataProviderRemoved,
    onFilterChange,
    onPinEvent,
    onRangeSelected,
    onToggleDataProviderEnabled,
    onToggleDataProviderExcluded,
    onUnPinEvent,
    pinnedEventIds,
    range,
    rowRenderers,
    show,
    sort,
    updateNote,
  }) => {
    const combinedQueries = combineQueries(dataProviders, indexPattern, kqlQuery, kqlMode);
    return (
      <AutoSizer detectAnyWindowResize={true} content>
        {({ measureRef, content: { height: timelineHeaderHeight = 0, width = 0 } }) => (
          <TimelineContainer data-test-subj="timeline">
            <WrappedByAutoSizer innerRef={measureRef}>
              <TimelineHeader
                id={id}
                indexPattern={indexPattern}
                dataProviders={dataProviders}
                onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
                onChangeDroppableAndProvider={onChangeDroppableAndProvider}
                onDataProviderRemoved={onDataProviderRemoved}
                onToggleDataProviderEnabled={onToggleDataProviderEnabled}
                onToggleDataProviderExcluded={onToggleDataProviderExcluded}
                show={show}
                sort={sort}
              />
            </WrappedByAutoSizer>

            {combinedQueries != null ? (
              <TimelineQuery
                sourceId="default"
                limit={itemsPerPage}
                filterQuery={combinedQueries.filterQuery}
                sortField={{
                  sortFieldId: sort.columnId,
                  direction: sort.sortDirection as Direction,
                }}
              >
                {({ events, loading, totalCount, pageInfo, loadMore, getUpdatedAt }) => (
                  <>
                    <Body
                      addNoteToEvent={addNoteToEvent}
                      id={id}
                      columnHeaders={columnHeaders}
                      columnRenderers={columnRenderers}
                      data={events}
                      eventIdToNoteIds={eventIdToNoteIds}
                      getNotesByIds={getNotesByIds}
                      height={calculateBodyHeight({
                        flyoutHeight,
                        flyoutHeaderHeight,
                        timelineHeaderHeight,
                        timelineFooterHeight: footerHeight,
                      })}
                      onColumnSorted={onColumnSorted}
                      onFilterChange={onFilterChange}
                      onPinEvent={onPinEvent}
                      onRangeSelected={onRangeSelected}
                      onUnPinEvent={onUnPinEvent}
                      pinnedEventIds={pinnedEventIds}
                      range={range}
                      rowRenderers={rowRenderers}
                      sort={sort}
                      updateNote={updateNote}
                    />
                    <Footer
                      dataProviders={dataProviders}
                      serverSideEventCount={totalCount}
                      hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                      height={footerHeight}
                      isLoading={loading}
                      itemsCount={events.length}
                      itemsPerPage={itemsPerPage}
                      itemsPerPageOptions={itemsPerPageOptions}
                      onChangeItemsPerPage={onChangeItemsPerPage}
                      onLoadMore={loadMore}
                      nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                      tieBreaker={getOr(null, 'endCursor.tiebreaker', pageInfo)!}
                      getUpdatedAt={getUpdatedAt}
                      width={width}
                    />
                  </>
                )}
              </TimelineQuery>
            ) : null}
          </TimelineContainer>
        )}
      </AutoSizer>
    );
  }
);
