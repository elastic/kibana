/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '../../../../../../src/plugins/data/common';
import { PinnedEvent, TimelineNonEcsData, Direction } from '../../graphql/types';

export const DEFAULT_PAGE_COUNT = 2; // Eui Pager will not render unless this is a minimum of 2 pages
/** The (fixed) width of the Actions column */
export const DEFAULT_ACTIONS_COLUMN_WIDTH = 115; // px;
/**
 * The (fixed) width of the Actions column when the timeline body is used as
 * an events viewer, which has fewer actions than a regular events viewer
 */
export const EVENTS_VIEWER_ACTIONS_COLUMN_WIDTH = 32; // px;
/** Additional column width to include when checkboxes are shown **/
export const SHOW_CHECK_BOXES_COLUMN_WIDTH = 32; // px;
/** The default minimum width of a column (when a width for the column type is not specified) */
export const DEFAULT_COLUMN_MIN_WIDTH = 180; // px
/** The default minimum width of a column of type `date` */
export const DEFAULT_DATE_COLUMN_MIN_WIDTH = 190; // px

export const DEFAULT_TIMELINE_WIDTH = 1100; // px

export type KqlMode = 'filter' | 'search';
export type EventType = 'all' | 'raw' | 'signal';

export type ColumnHeaderType = 'not-filtered' | 'text-filter';

/** Uniquely identifies a column */
export type ColumnId = string;

export type KueryFilterQueryKind = 'kuery' | 'lucene';

export interface KueryFilterQuery {
  kind: KueryFilterQueryKind;
  expression: string;
}

export interface SerializedFilterQuery {
  kuery: KueryFilterQuery | null;
  serializedQuery: string;
}

/** Specifies a column's sort direction */
export type SortDirection = 'none' | Direction;

/** Specifies which column the timeline is sorted on */
export interface Sort {
  columnId: ColumnId;
  sortDirection: SortDirection;
}

/** Represents the Timeline data providers */

/** The `is` operator in a KQL query */
export const IS_OPERATOR = ':';

/** The `exists` operator in a KQL query */
export const EXISTS_OPERATOR = ':*';

/** The operator applied to a field */
export type QueryOperator = ':' | ':*';

export interface QueryMatch {
  field: string;
  displayField?: string;
  value: string | number;
  displayValue?: string | number;
  operator: QueryOperator;
}

export interface DataProvider {
  /** Uniquely identifies a data provider */
  id: string;
  /** Human readable */
  name: string;
  /**
   * When `false`, a data provider is temporarily disabled, but not removed from
   * the timeline. default: `true`
   */
  enabled: boolean;
  /**
   * When `true`, a data provider is excluding the match, but not removed from
   * the timeline. default: `false`
   */
  excluded: boolean;
  /**
   * Return the KQL query who have been added by user
   */
  kqlQuery: string;
  /**
   * Returns a query properties that, when executed, returns the data for this provider
   */
  queryMatch: QueryMatch;
  /**
   * Additional query clauses that are ANDed with this query to narrow results
   */
  and: DataProvidersAnd[];
}

export type DataProvidersAnd = Pick<DataProvider, Exclude<keyof DataProvider, 'and'>>;

/** The specification of a column header */
export interface ColumnHeaderOptions {
  aggregatable?: boolean;
  category?: string;
  columnHeaderType: ColumnHeaderType;
  description?: string;
  example?: string;
  format?: string;
  id: ColumnId;
  label?: string;
  linkField?: string;
  placeholder?: string;
  type?: string;
  width?: number;
}

export interface TimelineModel {
  /** The columns displayed in the timeline */
  columns: ColumnHeaderOptions[];
  /** The sources of the event data shown in the timeline */
  dataProviders: DataProvider[];
  /** Events to not be rendered **/
  deletedEventIds: string[];
  /** A summary of the events and notes in this timeline */
  description: string;
  /** Typoe of event you want to see in this timeline */
  eventType?: EventType;
  /** A map of events in this timeline to the chronologically ordered notes (in this timeline) associated with the event */
  eventIdToNoteIds: Record<string, string[]>;
  filters?: Filter[];
  /** The chronological history of actions related to this timeline */
  historyIds: string[];
  /** The chronological history of actions related to this timeline */
  highlightedDropAndProviderId: string;
  /** Uniquely identifies the timeline */
  id: string;
  /** If selectAll checkbox in header is checked **/
  isSelectAllChecked: boolean;
  /** Events to be rendered as loading **/
  loadingEventIds: string[];
  savedObjectId: string | null;
  /** When true, this timeline was marked as "favorite" by the user */
  isFavorite: boolean;
  /** When true, the timeline will update as new data arrives */
  isLive: boolean;
  /** The number of items to show in a single page of results */
  itemsPerPage: number;
  /** Displays a series of choices that when selected, become the value of `itemsPerPage` */
  itemsPerPageOptions: number[];
  /** determines the behavior of the KQL bar */
  kqlMode: KqlMode;
  /** the KQL query in the KQL bar */
  kqlQuery: {
    filterQuery: SerializedFilterQuery | null;
    filterQueryDraft: KueryFilterQuery | null;
  };
  /** Title */
  title: string;
  /** Notes added to the timeline itself. Notes added to events are stored (separately) in `eventIdToNote` */
  noteIds: string[];
  /** Events pinned to this timeline */
  pinnedEventIds: Record<string, boolean>;
  pinnedEventsSaveObject: Record<string, PinnedEvent>;
  /** Specifies the granularity of the date range (e.g. 1 Day / Week / Month) applicable to the mini-map */
  dateRange: {
    start: number;
    end: number;
  };
  savedQueryId?: string | null;
  /** Events selected on this timeline -- eventId to TimelineNonEcsData[] mapping of data required for batch actions **/
  selectedEventIds: Record<string, TimelineNonEcsData[]>;
  /** When true, show the timeline flyover */
  show: boolean;
  /** When true, shows checkboxes enabling selection. Selected events store in selectedEventIds **/
  showCheckboxes: boolean;
  /** When true, shows additional rowRenderers below the PlainRowRenderer **/
  showRowRenderers: boolean;
  /**  Specifies which column the timeline is sorted on, and the direction (ascending / descending) */
  sort: Sort;
  /** Persists the UI state (width) of the timeline flyover */
  width: number;
  /** timeline is saving */
  isSaving: boolean;
  isLoading: boolean;
  version: string | null;
}

export type SubsetTimelineModel = Readonly<
  Pick<
    TimelineModel,
    | 'columns'
    | 'dataProviders'
    | 'deletedEventIds'
    | 'description'
    | 'eventType'
    | 'eventIdToNoteIds'
    | 'highlightedDropAndProviderId'
    | 'historyIds'
    | 'isFavorite'
    | 'isLive'
    | 'isSelectAllChecked'
    | 'itemsPerPage'
    | 'itemsPerPageOptions'
    | 'kqlMode'
    | 'kqlQuery'
    | 'title'
    | 'loadingEventIds'
    | 'noteIds'
    | 'pinnedEventIds'
    | 'pinnedEventsSaveObject'
    | 'dateRange'
    | 'selectedEventIds'
    | 'show'
    | 'showCheckboxes'
    | 'showRowRenderers'
    | 'sort'
    | 'width'
    | 'isSaving'
    | 'isLoading'
    | 'savedObjectId'
    | 'version'
  >
>;

export interface TimelineUrl {
  id: string;
  isOpen: boolean;
}
