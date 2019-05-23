/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { OpenTimeline } from './open_timeline';
import { OPEN_TIMELINE_CLASS_NAME } from './helpers';
import { OpenTimelineModal } from './open_timeline_modal/open_timeline_modal';
import {
  DeleteTimelines,
  EuiSearchBarQuery,
  OnAddTimelinesToFavorites,
  OnDeleteSelected,
  OnOpenTimeline,
  OnQueryChange,
  OnSelectionChange,
  OnTableChange,
  OnTableChangeParams,
  OpenTimelineProps,
  OnToggleOnlyFavorites,
  TimelineResult,
  OnToggleShowNotes,
} from './types';

export const DEFAULT_SORT_FIELD = 'updated';
export const DEFAULT_SORT_DIRECTION = 'desc';

interface State {
  /** Required by EuiTable for expandable rows: a map of `TimelineResult.savedObjectId` to rendered notes */
  itemIdToExpandedNotesRowMap: Record<string, JSX.Element>;
  /** Only query for favorite timelines when true */
  onlyFavorites: boolean;
  /** The requested page of results */
  pageIndex: number;
  /** The requested size of each page of search results */
  pageSize: number;
  /** The current search criteria */
  search: string;
  /** The currently-selected timelines in the table */
  selectedItems: TimelineResult[];
  /** The requested sort direction of the query results */
  sortDirection: 'asc' | 'desc';
  /** The requested field to sort on */
  sortField: string;
}

type Props = Pick<OpenTimelineProps, 'defaultPageSize' | 'title'> & {
  /** Performs IO to add the specified timelines to the user's favorites */
  addTimelinesToFavorites?: (timelineIds: string[]) => void;
  /** Performs IO to delete the specified timelines */
  deleteTimelines?: DeleteTimelines;
  /** Invoked when the user clicks on the name of a timeline to open it */
  openTimeline: OnOpenTimeline;
  /**
   * TODO: remove this prop (used for testing) when the results of executing
   * a search are provided by the GraphQL query
   */
  searchResults: TimelineResult[];
};

/** Returns a collection of selected timeline ids */
export const getSelectedTimelineIds = (selectedItems: TimelineResult[]): string[] =>
  selectedItems.reduce<string[]>(
    (validSelections, timelineResult) =>
      timelineResult.savedObjectId != null
        ? [...validSelections, timelineResult.savedObjectId]
        : validSelections,
    []
  );

/** Manages the state (e.g table selection) of the (pure) `OpenTimeline` component */
export class StatefulOpenTimeline extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      itemIdToExpandedNotesRowMap: {},
      onlyFavorites: false,
      search: '',
      pageIndex: 0,
      pageSize: props.defaultPageSize,
      sortField: DEFAULT_SORT_FIELD,
      sortDirection: DEFAULT_SORT_DIRECTION,
      selectedItems: [],
    };
  }

  public componentDidMount() {
    this.focusInput();
  }

  public render() {
    const {
      addTimelinesToFavorites,
      deleteTimelines,
      defaultPageSize,
      openTimeline,
      searchResults,
      title,
    } = this.props;
    const {
      itemIdToExpandedNotesRowMap,
      onlyFavorites,
      pageIndex,
      pageSize,
      search: query,
      selectedItems,
      sortDirection,
      sortField,
    } = this.state;

    {
      // TODO: wrap `OpenTimeline` below with the GraphQL query, and pass
      // `isLoading`, `searchResults`, `totalSearchResultsCount`, etc:
      return deleteTimelines != null ? (
        <OpenTimeline
          deleteTimelines={deleteTimelines}
          defaultPageSize={defaultPageSize}
          isLoading={false}
          itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
          onAddTimelinesToFavorites={
            addTimelinesToFavorites != null ? this.onAddTimelinesToFavorites : undefined
          }
          onDeleteSelected={deleteTimelines != null ? this.onDeleteSelected : undefined}
          onlyFavorites={onlyFavorites}
          onOpenTimeline={openTimeline}
          onQueryChange={this.onQueryChange}
          onSelectionChange={this.onSelectionChange}
          onTableChange={this.onTableChange}
          onToggleOnlyFavorites={this.onToggleOnlyFavorites}
          onToggleShowNotes={this.onToggleShowNotes}
          pageIndex={pageIndex}
          pageSize={pageSize}
          query={query}
          searchResults={searchResults.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)}
          selectedItems={selectedItems}
          sortDirection={sortDirection}
          sortField={sortField}
          title={title}
          totalSearchResultsCount={searchResults.length}
        />
      ) : (
        <OpenTimelineModal
          deleteTimelines={deleteTimelines}
          defaultPageSize={defaultPageSize}
          isLoading={false}
          itemIdToExpandedNotesRowMap={itemIdToExpandedNotesRowMap}
          onAddTimelinesToFavorites={
            addTimelinesToFavorites != null ? this.onAddTimelinesToFavorites : undefined
          }
          onDeleteSelected={deleteTimelines != null ? this.onDeleteSelected : undefined}
          onlyFavorites={onlyFavorites}
          onOpenTimeline={openTimeline}
          onQueryChange={this.onQueryChange}
          onSelectionChange={this.onSelectionChange}
          onTableChange={this.onTableChange}
          onToggleOnlyFavorites={this.onToggleOnlyFavorites}
          onToggleShowNotes={this.onToggleShowNotes}
          pageIndex={pageIndex}
          pageSize={pageSize}
          query={query}
          searchResults={searchResults.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)}
          selectedItems={selectedItems}
          sortDirection={sortDirection}
          sortField={sortField}
          title={title}
          totalSearchResultsCount={searchResults.length}
        />
      );
    }
  }

  /** Invoked when the user presses enters to submit the text in the search input */
  private onQueryChange: OnQueryChange = (query: EuiSearchBarQuery) => {
    this.setState({
      search: query.queryText.trim(),
    });
  };

  /** Focuses the input that filters the field browser */
  private focusInput = () => {
    const elements = document.querySelector<HTMLElement>(`.${OPEN_TIMELINE_CLASS_NAME} input`);

    if (elements != null) {
      elements.focus();
    }
  };

  /** Invoked when the user clicks the action to add the selected timelines to favorites */
  private onAddTimelinesToFavorites: OnAddTimelinesToFavorites = () => {
    const { addTimelinesToFavorites } = this.props;
    const { selectedItems } = this.state;

    if (addTimelinesToFavorites != null) {
      addTimelinesToFavorites(getSelectedTimelineIds(selectedItems));

      // TODO: it's not possible to clear the selection state of the newly-favorited
      // items, because we can't pass the selection state as props to the table.
      // See: https://github.com/elastic/eui/issues/1077

      // TODO: the query must re-execute to show the results of the mutation
    }
  };

  /** Invoked when the user clicks the action to delete the selected timelines */
  private onDeleteSelected: OnDeleteSelected = () => {
    const { deleteTimelines } = this.props;
    const { selectedItems } = this.state;

    if (deleteTimelines != null) {
      deleteTimelines(getSelectedTimelineIds(selectedItems));

      // NOTE: we clear the selection state below, but if the server fails to
      // delete a timeline, it will remain selected in the table:
      this.resetSelectionState();

      // TODO: the query must re-execute to show the results of the deletion
    }
  };

  /** Invoked when the user selects (or de-selects) timelines */
  private onSelectionChange: OnSelectionChange = (selectedItems: TimelineResult[]) => {
    this.setState({ selectedItems }); // <-- this is NOT passed down as props to the table: https://github.com/elastic/eui/issues/1077
  };

  /** Invoked by the EUI table implementation when the user interacts with the table (i.e. to update sorting) */
  private onTableChange: OnTableChange = ({ page, sort }: OnTableChangeParams) => {
    const { index: pageIndex, size: pageSize } = page;
    const { field: sortField, direction: sortDirection } = sort;

    this.setState({
      pageIndex,
      pageSize,
      sortDirection,
      sortField,
    });
  };

  /** Invoked when the user toggles the option to only view favorite timelines */
  private onToggleOnlyFavorites: OnToggleOnlyFavorites = () => {
    this.setState(state => ({
      onlyFavorites: !state.onlyFavorites,
    }));
  };

  /** Invoked when the user toggles the expansion or collapse of inline notes in a table row */
  private onToggleShowNotes: OnToggleShowNotes = (
    itemIdToExpandedNotesRowMap: Record<string, JSX.Element>
  ) => {
    this.setState(() => ({
      itemIdToExpandedNotesRowMap,
    }));
  };

  /** Resets the selection state such that all timelines are unselected */
  private resetSelectionState = () => {
    this.setState({
      selectedItems: [],
    });
  };
}
