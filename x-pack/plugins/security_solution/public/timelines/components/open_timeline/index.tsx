/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';
import React, { useEffect, useState, useCallback } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { Dispatch } from 'redux';
import { defaultHeaders } from '../timeline/body/column_headers/default_headers';
import { deleteTimelineMutation } from '../../containers/delete/persist.gql_query';
import { useGetAllTimeline } from '../../containers/all';
import { DeleteTimelineMutation, SortFieldTimeline, Direction } from '../../../graphql/types';
import { State } from '../../../common/store';
import { ColumnHeaderOptions, TimelineModel } from '../../../timelines/store/timeline/model';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import {
  createTimeline as dispatchCreateNewTimeline,
  updateIsLoading as dispatchUpdateIsLoading,
} from '../../../timelines/store/timeline/actions';
import { OpenTimeline } from './open_timeline';
import { OPEN_TIMELINE_CLASS_NAME, queryTimelineById, dispatchUpdateTimeline } from './helpers';
import { OpenTimelineModalBody } from './open_timeline_modal/open_timeline_modal_body';
import {
  ActionTimelineToShow,
  DeleteTimelines,
  EuiSearchBarQuery,
  OnDeleteSelected,
  OnOpenTimeline,
  OnQueryChange,
  OnSelectionChange,
  OnTableChange,
  OnTableChangeParams,
  OpenTimelineProps,
  OnToggleOnlyFavorites,
  OpenTimelineResult,
  OnToggleShowNotes,
  OnDeleteOneTimeline,
} from './types';
import { DEFAULT_SORT_FIELD, DEFAULT_SORT_DIRECTION } from './constants';
import { useTimelineTypes } from './use_timeline_types';
import { disableTemplate } from '../../../../common/constants';

interface OwnProps<TCache = object> {
  apolloClient: ApolloClient<TCache>;
  /** Displays open timeline in modal */
  isModal: boolean;
  closeModalTimeline?: () => void;
  hideActions?: ActionTimelineToShow[];
  onOpenTimeline?: (timeline: TimelineModel) => void;
}

export type OpenTimelineOwnProps = OwnProps &
  Pick<
    OpenTimelineProps,
    'defaultPageSize' | 'title' | 'importDataModalToggle' | 'setImportDataModalToggle'
  > &
  PropsFromRedux;

/** Returns a collection of selected timeline ids */
export const getSelectedTimelineIds = (selectedItems: OpenTimelineResult[]): string[] =>
  selectedItems.reduce<string[]>(
    (validSelections, timelineResult) =>
      timelineResult.savedObjectId != null
        ? [...validSelections, timelineResult.savedObjectId]
        : validSelections,
    []
  );

/** Manages the state (e.g table selection) of the (pure) `OpenTimeline` component */
export const StatefulOpenTimelineComponent = React.memo<OpenTimelineOwnProps>(
  ({
    apolloClient,
    closeModalTimeline,
    createNewTimeline,
    defaultPageSize,
    hideActions = [],
    isModal = false,
    importDataModalToggle,
    onOpenTimeline,
    setImportDataModalToggle,
    timeline,
    title,
    updateTimeline,
    updateIsLoading,
  }) => {
    /** Required by EuiTable for expandable rows: a map of `TimelineResult.savedObjectId` to rendered notes */
    const [itemIdToExpandedNotesRowMap, setItemIdToExpandedNotesRowMap] = useState<
      Record<string, JSX.Element>
    >({});
    /** Only query for favorite timelines when true */
    const [onlyFavorites, setOnlyFavorites] = useState(false);
    /** The requested page of results */
    const [pageIndex, setPageIndex] = useState(0);
    /** The requested size of each page of search results */
    const [pageSize, setPageSize] = useState(defaultPageSize);
    /** The current search criteria */
    const [search, setSearch] = useState('');
    /** The currently-selected timelines in the table */
    const [selectedItems, setSelectedItems] = useState<OpenTimelineResult[]>([]);
    /** The requested sort direction of the query results */
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);
    /** The requested field to sort on */
    const [sortField, setSortField] = useState(DEFAULT_SORT_FIELD);

    const { timelineType, timelineTabs, timelineFilters } = useTimelineTypes();
    const { fetchAllTimeline, timelines, loading, totalCount } = useGetAllTimeline();

    const refetch = useCallback(() => {
      fetchAllTimeline({
        pageInfo: {
          pageIndex: pageIndex + 1,
          pageSize,
        },
        search,
        sort: { sortField: sortField as SortFieldTimeline, sortOrder: sortDirection as Direction },
        onlyUserFavorite: onlyFavorites,
        timelineType,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageIndex, pageSize, search, sortField, sortDirection, timelineType, onlyFavorites]);

    /** Invoked when the user presses enters to submit the text in the search input */
    const onQueryChange: OnQueryChange = useCallback((query: EuiSearchBarQuery) => {
      setSearch(query.queryText.trim());
    }, []);

    /** Focuses the input that filters the field browser */
    const focusInput = () => {
      const elements = document.querySelector<HTMLElement>(`.${OPEN_TIMELINE_CLASS_NAME} input`);

      if (elements != null) {
        elements.focus();
      }
    };

    /* This feature will be implemented in the near future, so we are keeping it to know what to do */

    /** Invoked when the user clicks the action to add the selected timelines to favorites */
    // const onAddTimelinesToFavorites: OnAddTimelinesToFavorites = () => {
    // const { addTimelinesToFavorites } = this.props;
    // const { selectedItems } = this.state;
    // if (addTimelinesToFavorites != null) {
    //   addTimelinesToFavorites(getSelectedTimelineIds(selectedItems));
    // TODO: it's not possible to clear the selection state of the newly-favorited
    // items, because we can't pass the selection state as props to the table.
    // See: https://github.com/elastic/eui/issues/1077
    // TODO: the query must re-execute to show the results of the mutation
    // }
    // };

    const deleteTimelines: DeleteTimelines = useCallback(
      async (timelineIds: string[]) => {
        if (timelineIds.includes(timeline.savedObjectId || '')) {
          createNewTimeline({ id: 'timeline-1', columns: defaultHeaders, show: false });
        }

        await apolloClient.mutate<
          DeleteTimelineMutation.Mutation,
          DeleteTimelineMutation.Variables
        >({
          mutation: deleteTimelineMutation,
          fetchPolicy: 'no-cache',
          variables: { id: timelineIds },
        });
        refetch();
      },
      [apolloClient, createNewTimeline, refetch, timeline]
    );

    const onDeleteOneTimeline: OnDeleteOneTimeline = useCallback(
      async (timelineIds: string[]) => {
        // The type for `deleteTimelines` is incorrect, it returns a Promise
        await deleteTimelines(timelineIds);
      },
      [deleteTimelines]
    );

    /** Invoked when the user clicks the action to delete the selected timelines */
    const onDeleteSelected: OnDeleteSelected = useCallback(async () => {
      // The type for `deleteTimelines` is incorrect, it returns a Promise
      await deleteTimelines(getSelectedTimelineIds(selectedItems));

      // NOTE: we clear the selection state below, but if the server fails to
      // delete a timeline, it will remain selected in the table:
      resetSelectionState();

      // TODO: the query must re-execute to show the results of the deletion
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedItems, deleteTimelines]);

    /** Invoked when the user selects (or de-selects) timelines */
    const onSelectionChange: OnSelectionChange = useCallback(
      (newSelectedItems: OpenTimelineResult[]) => {
        setSelectedItems(newSelectedItems); // <-- this is NOT passed down as props to the table: https://github.com/elastic/eui/issues/1077
      },
      []
    );

    /** Invoked by the EUI table implementation when the user interacts with the table (i.e. to update sorting) */
    const onTableChange: OnTableChange = useCallback(({ page, sort }: OnTableChangeParams) => {
      const { index, size } = page;
      const { field, direction } = sort;
      setPageIndex(index);
      setPageSize(size);
      setSortDirection(direction);
      setSortField(field);
    }, []);

    /** Invoked when the user toggles the option to only view favorite timelines */
    const onToggleOnlyFavorites: OnToggleOnlyFavorites = useCallback(() => {
      setOnlyFavorites(!onlyFavorites);
    }, [onlyFavorites]);

    /** Invoked when the user toggles the expansion or collapse of inline notes in a table row */
    const onToggleShowNotes: OnToggleShowNotes = useCallback(
      (newItemIdToExpandedNotesRowMap: Record<string, JSX.Element>) => {
        setItemIdToExpandedNotesRowMap(newItemIdToExpandedNotesRowMap);
      },
      []
    );

    /** Resets the selection state such that all timelines are unselected */
    const resetSelectionState = useCallback(() => {
      setSelectedItems([]);
    }, []);

    const openTimeline: OnOpenTimeline = useCallback(
      ({ duplicate, timelineId }: { duplicate: boolean; timelineId: string }) => {
        if (isModal && closeModalTimeline != null) {
          closeModalTimeline();
        }

        queryTimelineById({
          apolloClient,
          duplicate,
          onOpenTimeline,
          timelineId,
          updateIsLoading,
          updateTimeline,
        });
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [apolloClient, updateIsLoading, updateTimeline]
    );

    useEffect(() => {
      focusInput();
    }, []);

    useEffect(() => {
      refetch();
    }, [refetch]);

    return !isModal ? (
      <OpenTimeline
        data-test-subj={'open-timeline'}
        deleteTimelines={onDeleteOneTimeline}
        defaultPageSize={defaultPageSize}
        isLoading={loading}
        itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
        importDataModalToggle={importDataModalToggle}
        onAddTimelinesToFavorites={undefined}
        onDeleteSelected={onDeleteSelected}
        onlyFavorites={onlyFavorites}
        onOpenTimeline={openTimeline}
        onQueryChange={onQueryChange}
        onSelectionChange={onSelectionChange}
        onTableChange={onTableChange}
        onToggleOnlyFavorites={onToggleOnlyFavorites}
        onToggleShowNotes={onToggleShowNotes}
        pageIndex={pageIndex}
        pageSize={pageSize}
        query={search}
        refetch={refetch}
        searchResults={timelines}
        setImportDataModalToggle={setImportDataModalToggle}
        selectedItems={selectedItems}
        sortDirection={sortDirection}
        sortField={sortField}
        tabs={!disableTemplate ? timelineTabs : undefined}
        title={title}
        totalSearchResultsCount={totalCount}
      />
    ) : (
      <OpenTimelineModalBody
        data-test-subj={'open-timeline-modal'}
        deleteTimelines={onDeleteOneTimeline}
        defaultPageSize={defaultPageSize}
        hideActions={hideActions}
        isLoading={loading}
        itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
        onAddTimelinesToFavorites={undefined}
        onlyFavorites={onlyFavorites}
        onOpenTimeline={openTimeline}
        onQueryChange={onQueryChange}
        onSelectionChange={onSelectionChange}
        onTableChange={onTableChange}
        onToggleOnlyFavorites={onToggleOnlyFavorites}
        onToggleShowNotes={onToggleShowNotes}
        pageIndex={pageIndex}
        pageSize={pageSize}
        query={search}
        searchResults={timelines}
        selectedItems={selectedItems}
        sortDirection={sortDirection}
        sortField={sortField}
        tabs={!disableTemplate ? timelineFilters : undefined}
        title={title}
        totalSearchResultsCount={totalCount}
      />
    );
  }
);

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State) => {
    const timeline = getTimeline(state, 'timeline-1') ?? timelineDefaults;
    return {
      timeline,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  createNewTimeline: ({
    id,
    columns,
    show,
  }: {
    id: string;
    columns: ColumnHeaderOptions[];
    show?: boolean;
  }) => dispatch(dispatchCreateNewTimeline({ id, columns, show })),
  updateIsLoading: ({ id, isLoading }: { id: string; isLoading: boolean }) =>
    dispatch(dispatchUpdateIsLoading({ id, isLoading })),
  updateTimeline: dispatchUpdateTimeline(dispatch),
});

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulOpenTimeline = connector(StatefulOpenTimelineComponent);
