/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SetStateAction, Dispatch } from 'react';
import { AllTimelinesVariables } from '../../containers/all';
import { TimelineModel } from '../../store/timeline/model';
import { NoteResult } from '../../../graphql/types';
import {
  TimelineTypeLiteral,
  TimelineTypeLiteralWithNull,
  TimelineStatus,
  TemplateTimelineTypeLiteral,
  RowRendererId,
} from '../../../../common/types/timeline';

/** The users who added a timeline to favorites */
export interface FavoriteTimelineResult {
  userId?: number | null;
  userName?: string | null;
  favoriteDate?: number | null;
}

export interface TimelineResultNote {
  savedObjectId?: string | null;
  note?: string | null;
  noteId?: string | null;
  updated?: number | null;
  updatedBy?: string | null;
}

export interface TimelineActionsOverflowColumns {
  width: string;
  actions: Array<{
    name: string;
    icon?: string;
    onClick?: (timeline: OpenTimelineResult) => void;
    description: string;
    render?: (timeline: OpenTimelineResult) => JSX.Element;
  } | null>;
}

/** The results of the query run by the OpenTimeline component */
export interface OpenTimelineResult {
  created?: number | null;
  description?: string | null;
  eventIdToNoteIds?: Readonly<Record<string, string[]>> | null;
  excludedRowRendererIds?: RowRendererId[] | null;
  favorite?: FavoriteTimelineResult[] | null;
  noteIds?: string[] | null;
  notes?: TimelineResultNote[] | null;
  pinnedEventIds?: Readonly<Record<string, boolean>> | null;
  savedObjectId?: string | null;
  status?: TimelineStatus | null;
  title?: string | null;
  templateTimelineId?: string | null;
  timelineType?: TimelineTypeLiteral;
  updated?: number | null;
  updatedBy?: string | null;
}

/**
 * EuiSearchBar returns this object when the user changes the query. At the
 * time of this writing, there is no typescript definition for this type, so
 * only the properties used by the Open Timeline component are exposed.
 */
export interface EuiSearchBarQuery {
  queryText: string;
}

/** Performs IO to delete the specified timelines */
export type DeleteTimelines = (timelineIds: string[], variables?: AllTimelinesVariables) => void;

/** Invoked when the user clicks the action make the selected timelines favorites */
export type OnAddTimelinesToFavorites = () => void;

/** Invoked when the user clicks the action to delete the selected timelines */
export type OnDeleteSelected = () => void;
export type OnDeleteOneTimeline = (timelineIds: string[]) => void;

/** Invoked when the user clicks on the name of a timeline to open it */
export type OnOpenTimeline = ({
  duplicate,
  timelineId,
  timelineType,
}: {
  duplicate: boolean;
  timelineId: string;
  timelineType?: TimelineTypeLiteral;
}) => void;

export type OnOpenDeleteTimelineModal = (selectedItem: OpenTimelineResult) => void;
export type SetActionTimeline = Dispatch<SetStateAction<OpenTimelineResult | undefined>>;
export type EnableExportTimelineDownloader = (selectedItem: OpenTimelineResult) => void;
/** Invoked when the user presses enters to submit the text in the search input */
export type OnQueryChange = (query: EuiSearchBarQuery) => void;

/** Invoked when the user selects (or de-selects) timelines in the table */
export type OnSelectionChange = (selectedItems: OpenTimelineResult[]) => void;

/** Invoked when the user toggles the option to only view favorite timelines */
export type OnToggleOnlyFavorites = () => void;

/** Invoked when the user toggles the expansion or collapse of inline notes in a table row */
export type OnToggleShowNotes = (itemIdToExpandedNotesRowMap: Record<string, JSX.Element>) => void;

/** Parameters to the OnTableChange callback  */
export interface OnTableChangeParams {
  page: {
    index: number;
    size: number;
  };
  sort: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

/** Invoked by the EUI table implementation when the user interacts with the table */
export type OnTableChange = (tableChange: OnTableChangeParams) => void;

export type ActionTimelineToShow = 'createFrom' | 'duplicate' | 'delete' | 'export' | 'selectable';

export interface OpenTimelineProps {
  /** Invoked when the user clicks the delete (trash) icon on an individual timeline */
  deleteTimelines?: DeleteTimelines;
  /** The default requested size of each page of search results */
  defaultPageSize: number;
  /** The number of favorite timeline*/
  favoriteCount?: number | null | undefined;
  /** Displays an indicator that data is loading when true */
  isLoading: boolean;
  /** Required by EuiTable for expandable rows: a map of `TimelineResult.savedObjectId` to rendered notes */
  itemIdToExpandedNotesRowMap: Record<string, JSX.Element>;
  /** Display import timelines modal*/
  importDataModalToggle?: boolean;
  /** If this callback is specified, a "Favorite Selected" button will be displayed, and this callback will be invoked when the button is clicked */
  onAddTimelinesToFavorites?: OnAddTimelinesToFavorites;
  /** If this callback is specified, a "Delete Selected" button will be displayed, and this callback will be invoked when the button is clicked */
  onDeleteSelected?: OnDeleteSelected;
  /** Only show favorite timelines when true */
  onlyFavorites: boolean;
  /** Invoked when the user presses enter after typing in the search bar */
  onQueryChange: OnQueryChange;
  /** Invoked when the user selects (or de-selects) timelines in the table */
  onSelectionChange: OnSelectionChange;
  /** Invoked when the user clicks on the name of a timeline to open it */
  onOpenTimeline: OnOpenTimeline;
  /** Invoked by the EUI table implementation when the user interacts with the table */
  onTableChange: OnTableChange;
  /** Invoked when the user toggles the option to only show favorite timelines */
  onToggleOnlyFavorites: OnToggleOnlyFavorites;
  /** Invoked when the user toggles the expansion or collapse of inline notes in a table row */
  onToggleShowNotes: OnToggleShowNotes;
  /** the requested page of results */
  pageIndex: number;
  /** the requested size of each page of search results */
  pageSize: number;
  /** The currently applied search criteria */
  query: string;
  /** Refetch table */
  refetch?: (existingTimeline?: OpenTimelineResult[], existingCount?: number) => void;
  /** The results of executing a search */
  searchResults: OpenTimelineResult[];
  /** the currently-selected timelines in the table */
  selectedItems: OpenTimelineResult[];
  /** Toggle export timelines modal*/
  setImportDataModalToggle?: React.Dispatch<React.SetStateAction<boolean>>;
  /** the requested sort direction of the query results */
  sortDirection: 'asc' | 'desc';
  /** the requested field to sort on */
  sortField: string;
  /** this affects timeline's behaviour like editable / duplicatible */
  timelineType: TimelineTypeLiteralWithNull;
  /** when timelineType === template, templatetimelineFilter is a JSX.Element */
  templateTimelineFilter: JSX.Element[] | null;
  /** timeline / timeline template */
  timelineFilter?: JSX.Element | JSX.Element[] | null;
  /** The title of the Open Timeline component  */
  title: string;
  /** The total (server-side) count of the search results */
  totalSearchResultsCount: number;
  /** Hide action on timeline if needed it */
  hideActions?: ActionTimelineToShow[];
}

export interface UpdateTimeline {
  duplicate: boolean;
  id: string;
  from: string;
  notes: NoteResult[] | null | undefined;
  timeline: TimelineModel;
  to: string;
  ruleNote?: string;
}

export type DispatchUpdateTimeline = ({
  duplicate,
  id,
  from,
  notes,
  timeline,
  to,
  ruleNote,
}: UpdateTimeline) => () => void;

export enum TimelineTabsStyle {
  tab = 'tab',
  filter = 'filter',
}

export interface TimelineTab {
  count: number | undefined;
  disabled: boolean;
  href: string;
  id: TimelineTypeLiteral;
  name: string;
  onClick: (ev: { preventDefault: () => void }) => void;
  withNext: boolean;
}

export interface TemplateTimelineFilter {
  id: TemplateTimelineTypeLiteral;
  name: string;
  disabled: boolean;
  withNext: boolean;
  count: number | undefined;
}
