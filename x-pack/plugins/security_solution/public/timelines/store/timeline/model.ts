/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterManager } from '@kbn/data-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { ExpandedDetailTimeline, SessionViewConfig } from '../../../../common/types';
import type {
  EqlOptionsSelected,
  TimelineNonEcsData,
} from '../../../../common/search_strategy/timeline';
import type {
  TimelineEventsType,
  TimelineType,
  TimelineStatus,
  TimelineTabs,
  ScrollToTopEvent,
  SortColumnTimeline,
  ColumnHeaderOptions,
  DataProvider,
  RowRendererId,
  SerializedFilterQuery,
} from '../../../../common/types/timeline';
import type { PinnedEvent } from '../../../../common/types/timeline/pinned_event';
import type { ResolveTimelineConfig } from '../../components/open_timeline/types';

export type KqlMode = 'filter' | 'search';

export interface TimelineModel {
  /** The selected tab to displayed in the timeline */
  activeTab: TimelineTabs;
  prevActiveTab: TimelineTabs;

  /** Used for scrolling to top when swiching tabs. It includes the timestamp of when the event happened */
  scrollToTop?: ScrollToTopEvent;
  /** Timeline saved object owner */
  createdBy?: string;
  /** A summary of the events and notes in this timeline */
  description: string;
  eqlOptions: EqlOptionsSelected;
  /** Type of event you want to see in this timeline */
  eventType?: TimelineEventsType;
  /** A map of events in this timeline to the chronologically ordered notes (in this timeline) associated with the event */
  eventIdToNoteIds: Record<string, string[]>;
  /** The chronological history of actions related to this timeline */
  historyIds: string[];
  /** The chronological history of actions related to this timeline */
  highlightedDropAndProviderId: string;
  /** When true, this timeline was marked as "favorite" by the user */
  isFavorite: boolean;
  /** When true, the timeline will update as new data arrives */
  isLive: boolean;
  /** determines the behavior of the KQL bar */
  kqlMode: KqlMode;
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
  resolveTimelineConfig?: ResolveTimelineConfig;
  showSaveModal?: boolean;
  savedQueryId?: string | null;
  sessionViewConfig: SessionViewConfig | null;
  /** When true, show the timeline flyover */
  show: boolean;
  /** status: active | draft */
  status: TimelineStatus;
  /** updated saved object timestamp */
  updated?: number;
  /** updated saved object user */
  updatedBy?: string | null;
  /** timeline is saving */
  isSaving: boolean;
  version: string | null;
  initialized?: boolean;
  savedObjectId: string | null;
  /**  Specifies which column the timeline is sorted on, and the direction (ascending / descending) */
  sort: SortColumnTimeline[];
  /** The columns displayed in the data table */
  columns: ColumnHeaderOptions[];
  defaultColumns: ColumnHeaderOptions[];
  /** The sources of the event data shown in the data table */
  dataProviders: DataProvider[];
  /** Kibana data view id **/
  dataViewId: string | null; // null if legacy pre-8.0 data table
  /** Events to not be rendered **/
  deletedEventIds: string[];
  documentType: string;
  excludedRowRendererIds: RowRendererId[];
  filterManager?: FilterManager;
  footerText?: string | React.ReactNode;
  loadingText?: string | React.ReactNode;
  queryFields: string[];
  /** This holds the view information for the flyout when viewing timeline in a consuming view (i.e. hosts page) or the side panel in the primary timeline view */
  expandedDetail: ExpandedDetailTimeline;
  /** When non-empty, display a graph view for this event */
  graphEventId?: string;
  indexNames: string[];
  /** The number of items to show in a single page of results */
  itemsPerPage: number;
  /** Displays a series of choices that when selected, become the value of `itemsPerPage` */
  itemsPerPageOptions: number[];
  /** the KQL query in the KQL bar */
  kqlQuery: {
    // TODO convert to nodebuilder
    filterQuery: SerializedFilterQuery | null;
  };
  /** Events to be rendered as loading **/
  loadingEventIds: string[];
  /** Specifies the granularity of the date range (e.g. 1 Day / Week / Month) applicable to the mini-map */
  dateRange: {
    start: string;
    end: string;
  };
  /** Uniquely identifies the timeline */
  id: string;
  filters?: Filter[];
  selectedEventIds: Record<string, TimelineNonEcsData[]>;
  /** If selectAll checkbox in header is checked **/
  isSelectAllChecked: boolean;
  isLoading: boolean;
  selectAll: boolean;
}

export type SubsetTimelineModel = Readonly<
  Pick<
    TimelineModel,
    | 'activeTab'
    | 'prevActiveTab'
    | 'columns'
    | 'defaultColumns'
    | 'dataProviders'
    | 'dataViewId'
    | 'deletedEventIds'
    | 'description'
    | 'documentType'
    | 'eventType'
    | 'eventIdToNoteIds'
    | 'excludedRowRendererIds'
    | 'expandedDetail'
    | 'footerText'
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
    | 'queryFields'
    | 'title'
    | 'timelineType'
    | 'templateTimelineId'
    | 'templateTimelineVersion'
    | 'loadingEventIds'
    | 'loadingText'
    | 'noteIds'
    | 'pinnedEventIds'
    | 'pinnedEventsSaveObject'
    | 'dateRange'
    | 'selectAll'
    | 'selectedEventIds'
    | 'sessionViewConfig'
    | 'show'
    | 'sort'
    | 'isSaving'
    | 'isLoading'
    | 'savedObjectId'
    | 'version'
    | 'status'
    | 'filters'
    | 'filterManager'
  >
>;

export interface TimelineUrl {
  activeTab?: TimelineTabs;
  id: string;
  isOpen: boolean;
  graphEventId?: string;
}
