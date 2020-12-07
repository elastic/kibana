/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '../../../../../../../src/plugins/data/public';

import { DataProvider } from '../../components/timeline/data_providers/data_provider';
import { Sort } from '../../components/timeline/body/sort';
import { PinnedEvent } from '../../../graphql/types';
import { TimelineNonEcsData } from '../../../../common/search_strategy/timeline';
import { SerializedFilterQuery } from '../../../common/store/types';
import type {
  TimelineEventsType,
  TimelineExpandedEvent,
  TimelineType,
  TimelineStatus,
  RowRendererId,
} from '../../../../common/types/timeline';

export const DEFAULT_PAGE_COUNT = 2; // Eui Pager will not render unless this is a minimum of 2 pages
export type KqlMode = 'filter' | 'search';

export type ColumnHeaderType = 'not-filtered' | 'text-filter';

/** Uniquely identifies a column */
export type ColumnId = string;

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
  width: number;
}

export enum TimelineTabs {
  query = 'query',
  graph = 'graph',
  notes = 'notes',
  pinned = 'pinned',
}

export interface TimelineModel {
  /** The selected tab to displayed in the timeline */
  activeTab: TimelineTabs;
  /** The columns displayed in the timeline */
  columns: ColumnHeaderOptions[];
  /** The sources of the event data shown in the timeline */
  dataProviders: DataProvider[];
  /** Events to not be rendered **/
  deletedEventIds: string[];
  /** A summary of the events and notes in this timeline */
  description: string;
  /** Typoe of event you want to see in this timeline */
  eventType?: TimelineEventsType;
  /** A map of events in this timeline to the chronologically ordered notes (in this timeline) associated with the event */
  eventIdToNoteIds: Record<string, string[]>;
  /** A list of Ids of excluded Row Renderers */
  excludedRowRendererIds: RowRendererId[];
  expandedEvent: TimelineExpandedEvent;
  filters?: Filter[];
  /** When non-empty, display a graph view for this event */
  graphEventId?: string;
  /** The chronological history of actions related to this timeline */
  historyIds: string[];
  /** The chronological history of actions related to this timeline */
  highlightedDropAndProviderId: string;
  /** Uniquely identifies the timeline */
  id: string;
  /** TO DO sourcerer @X define this */
  indexNames: string[];
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
  };
  /** Title */
  title: string;
  /** timelineType: default | template */
  timelineType: TimelineType;
  /** an unique id for timeline template */
  templateTimelineId: string | null;
  /** null for default timeline, number for timeline template */
  templateTimelineVersion: number | null;
  /** Notes added to the timeline itself. Notes added to events are stored (separately) in `eventIdToNote` */
  noteIds: string[];
  /** Events pinned to this timeline */
  pinnedEventIds: Record<string, boolean>;
  pinnedEventsSaveObject: Record<string, PinnedEvent>;
  /** Specifies the granularity of the date range (e.g. 1 Day / Week / Month) applicable to the mini-map */
  dateRange: {
    start: string;
    end: string;
  };
  savedQueryId?: string | null;
  /** Events selected on this timeline -- eventId to TimelineNonEcsData[] mapping of data required for batch actions **/
  selectedEventIds: Record<string, TimelineNonEcsData[]>;
  /** When true, show the timeline flyover */
  show: boolean;
  /** When true, shows checkboxes enabling selection. Selected events store in selectedEventIds **/
  showCheckboxes: boolean;
  /**  Specifies which column the timeline is sorted on, and the direction (ascending / descending) */
  sort: Sort;
  /** status: active | draft */
  status: TimelineStatus;
  /** updated saved object timestamp */
  updated?: number;
  /** timeline is saving */
  isSaving: boolean;
  isLoading: boolean;
  version: string | null;
}

export type SubsetTimelineModel = Readonly<
  Pick<
    TimelineModel,
    | 'activeTab'
    | 'columns'
    | 'dataProviders'
    | 'deletedEventIds'
    | 'description'
    | 'eventType'
    | 'eventIdToNoteIds'
    | 'excludedRowRendererIds'
    | 'expandedEvent'
    | 'graphEventId'
    | 'highlightedDropAndProviderId'
    | 'historyIds'
    | 'indexNames'
    | 'isFavorite'
    | 'isLive'
    | 'isSelectAllChecked'
    | 'itemsPerPage'
    | 'itemsPerPageOptions'
    | 'kqlMode'
    | 'kqlQuery'
    | 'title'
    | 'timelineType'
    | 'templateTimelineId'
    | 'templateTimelineVersion'
    | 'loadingEventIds'
    | 'noteIds'
    | 'pinnedEventIds'
    | 'pinnedEventsSaveObject'
    | 'dateRange'
    | 'selectedEventIds'
    | 'show'
    | 'showCheckboxes'
    | 'sort'
    | 'isSaving'
    | 'isLoading'
    | 'savedObjectId'
    | 'version'
    | 'status'
  >
>;

export interface TimelineUrl {
  activeTab?: TimelineTabs;
  id: string;
  isOpen: boolean;
  graphEventId?: string;
}
