/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataProvider } from '../../components/timeline/data_providers/data_provider';
import { EqlOptionsSelected } from '../../../../common/search_strategy/timeline';
import type {
  TimelineEventsType,
  TimelineType,
  TimelineStatus,
  TimelineTabs,
} from '../../../../common/types/timeline';
import { PinnedEvent } from '../../../../common/types/timeline/pinned_event';
import type { TGridModelForTimeline } from '../../../../../timelines/public';

export const DEFAULT_PAGE_COUNT = 2; // Eui Pager will not render unless this is a minimum of 2 pages
export type KqlMode = 'filter' | 'search';
export type ColumnHeaderType = 'not-filtered' | 'text-filter';

export type TimelineModel = TGridModelForTimeline & {
  /** The selected tab to displayed in the timeline */
  activeTab: TimelineTabs;
  prevActiveTab: TimelineTabs;
  /** Timeline saved object owner */
  createdBy?: string;
  /** The sources of the event data shown in the timeline */
  dataProviders: DataProvider[];
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
  showSaveModal?: boolean;
  savedQueryId?: string | null;
  /** When true, show the timeline flyover */
  show: boolean;
  /** status: active | draft */
  status: TimelineStatus;
  /** updated saved object timestamp */
  updated?: number;
  /** timeline is saving */
  isSaving: boolean;
  version: string | null;
};

export type SubsetTimelineModel = Readonly<
  Pick<
    TimelineModel,
    | 'activeTab'
    | 'prevActiveTab'
    | 'columns'
    | 'dataProviders'
    | 'deletedEventIds'
    | 'description'
    | 'eventType'
    | 'eventIdToNoteIds'
    | 'excludedRowRendererIds'
    | 'expandedDetail'
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
