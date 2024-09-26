/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Maybe } from '../../../search_strategy';
import type { DataProviderType } from './components.gen';
import {
  BareNote,
  BarePinnedEvent,
  DataProviderTypeEnum,
  FavoriteTimelineResponse,
  type FavoriteTimelineResult,
  ImportTimelineResult,
  ImportTimelines,
  type Note,
  PinnedEvent,
  PersistTimelineResponse,
  ResolvedTimeline,
  RowRendererId,
  RowRendererIdEnum,
  SavedTimeline,
  SavedTimelineWithSavedObjectId,
  Sort,
  SortDirection,
  SortFieldTimeline,
  SortFieldTimelineEnum,
  TemplateTimelineType,
  TemplateTimelineTypeEnum,
  TimelineErrorResponse,
  TimelineResponse,
  TimelineSavedToReturnObject,
  TimelineStatus,
  TimelineStatusEnum,
  TimelineType,
  TimelineTypeEnum,
} from './components.gen';

export {
  BareNote,
  BarePinnedEvent,
  DataProviderType,
  DataProviderTypeEnum,
  FavoriteTimelineResponse,
  ImportTimelineResult,
  ImportTimelines,
  Note,
  PinnedEvent,
  PersistTimelineResponse,
  ResolvedTimeline,
  RowRendererId,
  RowRendererIdEnum,
  SavedTimeline,
  SavedTimelineWithSavedObjectId,
  Sort,
  SortDirection,
  SortFieldTimeline,
  SortFieldTimelineEnum,
  TemplateTimelineType,
  TimelineErrorResponse,
  TimelineResponse,
  TemplateTimelineTypeEnum,
  TimelineSavedToReturnObject,
  TimelineStatus,
  TimelineStatusEnum,
  TimelineType,
  TimelineTypeEnum,
};

export type BarePinnedEventWithoutExternalRefs = Omit<BarePinnedEvent, 'timelineId'>;

/**
 * This type represents a note type stored in a saved object that does not include any fields that reference
 * other saved objects.
 */
export type BareNoteWithoutExternalRefs = Omit<BareNote, 'timelineId'>;

export const RowRendererCount = Object.keys(RowRendererIdEnum).length;
export const RowRendererValues = Object.values(RowRendererId.Values);

/**
 * Import/export timelines
 */

export type ExportedGlobalNotes = Array<Exclude<Note, 'eventId'>>;
export type ExportedEventNotes = Note[];

export interface ExportedNotes {
  eventNotes: ExportedEventNotes;
  globalNotes: ExportedGlobalNotes;
}

export type ExportedTimelines = SavedTimeline &
  ExportedNotes & {
    pinnedEventIds: string[];
  };

export interface ExportTimelineNotFoundError {
  statusCode: number;
  message: string;
}

export interface PageInfoTimeline {
  pageIndex: number;
  pageSize: number;
}

export interface ColumnHeaderResult {
  aggregatable?: Maybe<boolean>;
  category?: Maybe<string>;
  columnHeaderType?: Maybe<string>;
  description?: Maybe<string>;
  example?: Maybe<string>;
  indexes?: Maybe<string[]>;
  id?: Maybe<string>;
  name?: Maybe<string>;
  placeholder?: Maybe<string>;
  searchable?: Maybe<boolean>;
  type?: Maybe<string>;
}

export interface DataProviderResult {
  id?: Maybe<string>;
  name?: Maybe<string>;
  enabled?: Maybe<boolean>;
  excluded?: Maybe<boolean>;
  kqlQuery?: Maybe<string>;
  queryMatch?: Maybe<QueryMatchResult>;
  type?: Maybe<DataProviderType>;
  and?: Maybe<DataProviderResult[]>;
}

export interface QueryMatchResult {
  field?: Maybe<string>;
  displayField?: Maybe<string>;
  value?: Maybe<string | string[]>;
  displayValue?: Maybe<string>;
  operator?: Maybe<string>;
}

export interface DateRangePickerResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  start?: Maybe<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  end?: Maybe<any>;
}

export interface EqlOptionsResult {
  eventCategoryField?: Maybe<string>;
  tiebreakerField?: Maybe<string>;
  timestampField?: Maybe<string>;
  query?: Maybe<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  size?: Maybe<any>;
}

export interface FilterTimelineResult {
  exists?: Maybe<string>;
  meta?: Maybe<FilterMetaTimelineResult>;
  match_all?: Maybe<string>;
  missing?: Maybe<string>;
  query?: Maybe<string>;
  range?: Maybe<string>;
  script?: Maybe<string>;
}

export interface FilterMetaTimelineResult {
  alias?: Maybe<string>;
  controlledBy?: Maybe<string>;
  disabled?: Maybe<boolean>;
  field?: Maybe<string>;
  formattedValue?: Maybe<string>;
  index?: Maybe<string>;
  key?: Maybe<string>;
  negate?: Maybe<boolean>;
  params?: Maybe<string>;
  type?: Maybe<string>;
  value?: Maybe<string>;
}

export interface SerializedFilterQueryResult {
  filterQuery?: Maybe<SerializedKueryQueryResult>;
}

export interface KueryFilterQueryResult {
  kind?: Maybe<string>;
  expression?: Maybe<string>;
}

export interface SerializedKueryQueryResult {
  kuery?: Maybe<KueryFilterQueryResult>;
  serializedQuery?: Maybe<string>;
}

export interface TimelineResult {
  columns?: Maybe<ColumnHeaderResult[]>;
  created?: Maybe<number>;
  createdBy?: Maybe<string>;
  dataProviders?: Maybe<DataProviderResult[]>;
  dataViewId?: Maybe<string>;
  dateRange?: Maybe<DateRangePickerResult>;
  description?: Maybe<string>;
  eqlOptions?: Maybe<EqlOptionsResult>;
  eventIdToNoteIds?: Maybe<Note[]>;
  eventType?: Maybe<string>;
  excludedRowRendererIds?: Maybe<RowRendererId[]>;
  favorite?: Maybe<FavoriteTimelineResult[]>;
  filters?: Maybe<FilterTimelineResult[]>;
  kqlMode?: Maybe<string>;
  kqlQuery?: Maybe<SerializedFilterQueryResult>;
  indexNames?: Maybe<string[]>;
  notes?: Maybe<Note[]>;
  noteIds?: Maybe<string[]>;
  pinnedEventIds?: Maybe<string[]>;
  pinnedEventsSaveObject?: Maybe<PinnedEvent[]>;
  savedQueryId?: Maybe<string>;
  savedObjectId: string;
  sort?: Maybe<Sort>;
  status?: Maybe<TimelineStatus>;
  title?: Maybe<string>;
  templateTimelineId?: Maybe<string>;
  templateTimelineVersion?: Maybe<number>;
  timelineType?: Maybe<TimelineType>;
  updated?: Maybe<number>;
  updatedBy?: Maybe<string>;
  version: string;
  savedSearchId?: Maybe<string>;
}

export interface ResponseTimeline {
  code?: Maybe<number>;
  message?: Maybe<string>;
  timeline: TimelineResult;
}

export interface SortTimeline {
  sortField: SortFieldTimeline;
  sortOrder: SortDirection;
}
