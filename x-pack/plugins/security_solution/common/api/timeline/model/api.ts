/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as runtimeTypes from 'io-ts';
import { PositiveInteger } from '@kbn/securitysolution-io-ts-types';

import { stringEnum, unionWithNullType } from '../../../utility_types';

import type { Maybe } from '../../../search_strategy';
import { Direction } from '../../../search_strategy';
import type { PinnedEvent } from '../pinned_events/pinned_events_route';
import { PinnedEventRuntimeType } from '../pinned_events/pinned_events_route';
// TODO https://github.com/elastic/security-team/issues/7491
// eslint-disable-next-line no-restricted-imports
import {
  SavedObjectResolveAliasPurpose,
  SavedObjectResolveAliasTargetId,
  SavedObjectResolveOutcome,
} from '../../detection_engine/model/rule_schema_legacy';
import { ErrorSchema } from './error_schema';

export const BareNoteSchema = runtimeTypes.intersection([
  runtimeTypes.type({
    timelineId: unionWithNullType(runtimeTypes.string),
  }),
  runtimeTypes.partial({
    eventId: unionWithNullType(runtimeTypes.string),
    note: unionWithNullType(runtimeTypes.string),
    created: unionWithNullType(runtimeTypes.number),
    createdBy: unionWithNullType(runtimeTypes.string),
    updated: unionWithNullType(runtimeTypes.number),
    updatedBy: unionWithNullType(runtimeTypes.string),
  }),
]);

export type BareNote = runtimeTypes.TypeOf<typeof BareNoteSchema>;

/**
 * This type represents a note type stored in a saved object that does not include any fields that reference
 * other saved objects.
 */
export type BareNoteWithoutExternalRefs = Omit<BareNote, 'timelineId'>;

export const NoteRuntimeType = runtimeTypes.intersection([
  BareNoteSchema,
  runtimeTypes.type({
    noteId: runtimeTypes.string,
    version: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    timelineVersion: unionWithNullType(runtimeTypes.string),
  }),
]);

export type Note = runtimeTypes.TypeOf<typeof NoteRuntimeType>;

export interface ResponseNote {
  code?: Maybe<number>;

  message?: Maybe<string>;

  note: Note;
}

/*
 *  ColumnHeader Types
 */
const SavedColumnHeaderRuntimeType = runtimeTypes.partial({
  aggregatable: unionWithNullType(runtimeTypes.boolean),
  category: unionWithNullType(runtimeTypes.string),
  columnHeaderType: unionWithNullType(runtimeTypes.string),
  description: unionWithNullType(runtimeTypes.string),
  example: unionWithNullType(runtimeTypes.string),
  indexes: unionWithNullType(runtimeTypes.array(runtimeTypes.string)),
  id: unionWithNullType(runtimeTypes.string),
  name: unionWithNullType(runtimeTypes.string),
  placeholder: unionWithNullType(runtimeTypes.string),
  searchable: unionWithNullType(runtimeTypes.boolean),
  type: unionWithNullType(runtimeTypes.string),
});

/*
 *  DataProvider Types
 */
const SavedDataProviderQueryMatchBasicRuntimeType = runtimeTypes.partial({
  field: unionWithNullType(runtimeTypes.string),
  displayField: unionWithNullType(runtimeTypes.string),
  value: runtimeTypes.union([
    runtimeTypes.null,
    runtimeTypes.string,
    runtimeTypes.array(runtimeTypes.string),
  ]),
  displayValue: unionWithNullType(runtimeTypes.string),
  operator: unionWithNullType(runtimeTypes.string),
});

const SavedDataProviderQueryMatchRuntimeType = runtimeTypes.partial({
  id: unionWithNullType(runtimeTypes.string),
  name: unionWithNullType(runtimeTypes.string),
  enabled: unionWithNullType(runtimeTypes.boolean),
  excluded: unionWithNullType(runtimeTypes.boolean),
  kqlQuery: unionWithNullType(runtimeTypes.string),
  queryMatch: unionWithNullType(SavedDataProviderQueryMatchBasicRuntimeType),
});

export enum DataProviderType {
  default = 'default',
  template = 'template',
}

export const DataProviderTypeLiteralRt = runtimeTypes.union([
  runtimeTypes.literal(DataProviderType.default),
  runtimeTypes.literal(DataProviderType.template),
]);

const SavedDataProviderRuntimeType = runtimeTypes.partial({
  id: unionWithNullType(runtimeTypes.string),
  name: unionWithNullType(runtimeTypes.string),
  enabled: unionWithNullType(runtimeTypes.boolean),
  excluded: unionWithNullType(runtimeTypes.boolean),
  kqlQuery: unionWithNullType(runtimeTypes.string),
  queryMatch: unionWithNullType(SavedDataProviderQueryMatchBasicRuntimeType),
  and: unionWithNullType(runtimeTypes.array(SavedDataProviderQueryMatchRuntimeType)),
  type: unionWithNullType(DataProviderTypeLiteralRt),
});

/*
 *  Filters Types
 */
const SavedFilterMetaRuntimeType = runtimeTypes.partial({
  alias: unionWithNullType(runtimeTypes.string),
  controlledBy: unionWithNullType(runtimeTypes.string),
  disabled: unionWithNullType(runtimeTypes.boolean),
  field: unionWithNullType(runtimeTypes.string),
  formattedValue: unionWithNullType(runtimeTypes.string),
  index: unionWithNullType(runtimeTypes.string),
  key: unionWithNullType(runtimeTypes.string),
  negate: unionWithNullType(runtimeTypes.boolean),
  params: unionWithNullType(runtimeTypes.string),
  type: unionWithNullType(runtimeTypes.string),
  value: unionWithNullType(runtimeTypes.string),
});

const SavedFilterRuntimeType = runtimeTypes.partial({
  exists: unionWithNullType(runtimeTypes.string),
  meta: unionWithNullType(SavedFilterMetaRuntimeType),
  match_all: unionWithNullType(runtimeTypes.string),
  missing: unionWithNullType(runtimeTypes.string),
  query: unionWithNullType(runtimeTypes.string),
  range: unionWithNullType(runtimeTypes.string),
  script: unionWithNullType(runtimeTypes.string),
});

/*
 *  eqlOptionsQuery -> filterQuery Types
 */
const EqlOptionsRuntimeType = runtimeTypes.partial({
  eventCategoryField: unionWithNullType(runtimeTypes.string),
  query: unionWithNullType(runtimeTypes.string),
  tiebreakerField: unionWithNullType(runtimeTypes.string),
  timestampField: unionWithNullType(runtimeTypes.string),
  size: unionWithNullType(runtimeTypes.union([runtimeTypes.string, runtimeTypes.number])),
});

/*
 *  kqlQuery -> filterQuery Types
 */
const SavedKueryFilterQueryRuntimeType = runtimeTypes.partial({
  kind: unionWithNullType(runtimeTypes.string),
  expression: unionWithNullType(runtimeTypes.string),
});

const SavedSerializedFilterQueryQueryRuntimeType = runtimeTypes.partial({
  kuery: unionWithNullType(SavedKueryFilterQueryRuntimeType),
  serializedQuery: unionWithNullType(runtimeTypes.string),
});

const SavedFilterQueryQueryRuntimeType = runtimeTypes.partial({
  filterQuery: unionWithNullType(SavedSerializedFilterQueryQueryRuntimeType),
});

/*
 *  DatePicker Range Types
 */
const SavedDateRangePickerRuntimeType = runtimeTypes.partial({
  /* Before the change of all timestamp to ISO string the values of start and from
   * attributes where a number. Specifically UNIX timestamps.
   * To support old timeline's saved object we need to add the number io-ts type
   */
  start: unionWithNullType(runtimeTypes.union([runtimeTypes.string, runtimeTypes.number])),
  end: unionWithNullType(runtimeTypes.union([runtimeTypes.string, runtimeTypes.number])),
});

/*
 *  Favorite Types
 */
const SavedFavoriteRuntimeType = runtimeTypes.partial({
  keySearch: unionWithNullType(runtimeTypes.string),
  favoriteDate: unionWithNullType(runtimeTypes.number),
  fullName: unionWithNullType(runtimeTypes.string),
  userName: unionWithNullType(runtimeTypes.string),
});

/*
 *  Sort Types
 */

const SavedSortObject = runtimeTypes.partial({
  columnId: unionWithNullType(runtimeTypes.string),
  columnType: unionWithNullType(runtimeTypes.string),
  sortDirection: unionWithNullType(runtimeTypes.string),
});
const SavedSortRuntimeType = runtimeTypes.union([
  runtimeTypes.array(SavedSortObject),
  SavedSortObject,
]);

export type Sort = runtimeTypes.TypeOf<typeof SavedSortRuntimeType>;

/*
 *  Timeline Statuses
 */

export enum TimelineStatus {
  active = 'active',
  draft = 'draft',
  immutable = 'immutable',
}

export const TimelineStatusLiteralRt = runtimeTypes.union([
  runtimeTypes.literal(TimelineStatus.active),
  runtimeTypes.literal(TimelineStatus.draft),
  runtimeTypes.literal(TimelineStatus.immutable),
]);

const TimelineStatusLiteralWithNullRt = unionWithNullType(TimelineStatusLiteralRt);

export type TimelineStatusLiteralWithNull = runtimeTypes.TypeOf<
  typeof TimelineStatusLiteralWithNullRt
>;

export enum RowRendererId {
  /** event.kind: signal */
  alert = 'alert',
  /** endpoint alerts (created on the endpoint) */
  alerts = 'alerts',
  auditd = 'auditd',
  auditd_file = 'auditd_file',
  library = 'library',
  netflow = 'netflow',
  plain = 'plain',
  registry = 'registry',
  suricata = 'suricata',
  system = 'system',
  system_dns = 'system_dns',
  system_endgame_process = 'system_endgame_process',
  system_file = 'system_file',
  system_fim = 'system_fim',
  system_security_event = 'system_security_event',
  system_socket = 'system_socket',
  threat_match = 'threat_match',
  zeek = 'zeek',
}

const RowRendererIdRuntimeType = stringEnum(RowRendererId, 'RowRendererId');

/**
 * Timeline template type
 */

export enum TemplateTimelineType {
  elastic = 'elastic',
  custom = 'custom',
}

export const TemplateTimelineTypeLiteralRt = runtimeTypes.union([
  runtimeTypes.literal(TemplateTimelineType.elastic),
  runtimeTypes.literal(TemplateTimelineType.custom),
]);

export const TemplateTimelineTypeLiteralWithNullRt = unionWithNullType(
  TemplateTimelineTypeLiteralRt
);

export type TemplateTimelineTypeLiteral = runtimeTypes.TypeOf<typeof TemplateTimelineTypeLiteralRt>;
export type TemplateTimelineTypeLiteralWithNull = runtimeTypes.TypeOf<
  typeof TemplateTimelineTypeLiteralWithNullRt
>;

/*
 *  Timeline Types
 */

export enum TimelineType {
  default = 'default',
  template = 'template',
}

export const TimelineTypeLiteralRt = runtimeTypes.union([
  runtimeTypes.literal(TimelineType.template),
  runtimeTypes.literal(TimelineType.default),
]);

export const TimelineTypeLiteralWithNullRt = unionWithNullType(TimelineTypeLiteralRt);

export type TimelineTypeLiteral = runtimeTypes.TypeOf<typeof TimelineTypeLiteralRt>;
export type TimelineTypeLiteralWithNull = runtimeTypes.TypeOf<typeof TimelineTypeLiteralWithNullRt>;

/**
 * This is the response type
 */
export const SavedTimelineRuntimeType = runtimeTypes.partial({
  columns: unionWithNullType(runtimeTypes.array(SavedColumnHeaderRuntimeType)),
  dataProviders: unionWithNullType(runtimeTypes.array(SavedDataProviderRuntimeType)),
  dataViewId: unionWithNullType(runtimeTypes.string),
  description: unionWithNullType(runtimeTypes.string),
  eqlOptions: unionWithNullType(EqlOptionsRuntimeType),
  eventType: unionWithNullType(runtimeTypes.string),
  excludedRowRendererIds: unionWithNullType(runtimeTypes.array(RowRendererIdRuntimeType)),
  favorite: unionWithNullType(runtimeTypes.array(SavedFavoriteRuntimeType)),
  filters: unionWithNullType(runtimeTypes.array(SavedFilterRuntimeType)),
  indexNames: unionWithNullType(runtimeTypes.array(runtimeTypes.string)),
  kqlMode: unionWithNullType(runtimeTypes.string),
  kqlQuery: unionWithNullType(SavedFilterQueryQueryRuntimeType),
  title: unionWithNullType(runtimeTypes.string),
  templateTimelineId: unionWithNullType(runtimeTypes.string),
  templateTimelineVersion: unionWithNullType(runtimeTypes.number),
  timelineType: unionWithNullType(TimelineTypeLiteralRt),
  dateRange: unionWithNullType(SavedDateRangePickerRuntimeType),
  savedQueryId: unionWithNullType(runtimeTypes.string),
  sort: unionWithNullType(SavedSortRuntimeType),
  status: unionWithNullType(TimelineStatusLiteralRt),
  created: unionWithNullType(runtimeTypes.number),
  createdBy: unionWithNullType(runtimeTypes.string),
  updated: unionWithNullType(runtimeTypes.number),
  updatedBy: unionWithNullType(runtimeTypes.string),
  savedSearchId: unionWithNullType(runtimeTypes.string),
});

export type SavedTimeline = runtimeTypes.TypeOf<typeof SavedTimelineRuntimeType>;

export type SavedTimelineWithSavedObjectId = SavedTimeline & {
  savedObjectId?: string | null;
};

/**
 * This type represents a timeline type stored in a saved object that does not include any fields that reference
 * other saved objects.
 */
export type TimelineWithoutExternalRefs = Omit<SavedTimeline, 'dataViewId' | 'savedQueryId'>;

export const TimelineSavedToReturnObjectRuntimeType = runtimeTypes.intersection([
  SavedTimelineRuntimeType,
  runtimeTypes.type({
    savedObjectId: runtimeTypes.string,
    version: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    eventIdToNoteIds: runtimeTypes.array(NoteRuntimeType),
    noteIds: runtimeTypes.array(runtimeTypes.string),
    notes: runtimeTypes.array(NoteRuntimeType),
    pinnedEventIds: runtimeTypes.array(runtimeTypes.string),
    pinnedEventsSaveObject: runtimeTypes.array(PinnedEventRuntimeType),
  }),
]);

export type TimelineSavedObject = runtimeTypes.TypeOf<
  typeof TimelineSavedToReturnObjectRuntimeType
>;

export const SingleTimelineResponseType = runtimeTypes.type({
  data: runtimeTypes.type({
    getOneTimeline: TimelineSavedToReturnObjectRuntimeType,
  }),
});

export type SingleTimelineResponse = runtimeTypes.TypeOf<typeof SingleTimelineResponseType>;

/** Resolved Timeline Response */
export const ResolvedTimelineSavedObjectToReturnObjectRuntimeType = runtimeTypes.intersection([
  runtimeTypes.type({
    timeline: TimelineSavedToReturnObjectRuntimeType,
    outcome: SavedObjectResolveOutcome,
  }),
  runtimeTypes.partial({
    alias_target_id: SavedObjectResolveAliasTargetId,
    alias_purpose: SavedObjectResolveAliasPurpose,
  }),
]);

export type ResolvedTimelineWithOutcomeSavedObject = runtimeTypes.TypeOf<
  typeof ResolvedTimelineSavedObjectToReturnObjectRuntimeType
>;

export const ResolvedSingleTimelineResponseType = runtimeTypes.type({
  data: ResolvedTimelineSavedObjectToReturnObjectRuntimeType,
});

export type SingleTimelineResolveResponse = runtimeTypes.TypeOf<
  typeof ResolvedSingleTimelineResponseType
>;

const responseTimelines = runtimeTypes.type({
  timeline: runtimeTypes.array(TimelineSavedToReturnObjectRuntimeType),
  totalCount: runtimeTypes.number,
});

export type ResponseTimelines = runtimeTypes.TypeOf<typeof responseTimelines>;

export const allTimelinesResponse = runtimeTypes.intersection([
  responseTimelines,
  runtimeTypes.type({
    defaultTimelineCount: runtimeTypes.number,
    templateTimelineCount: runtimeTypes.number,
    elasticTemplateTimelineCount: runtimeTypes.number,
    customTemplateTimelineCount: runtimeTypes.number,
    favoriteCount: runtimeTypes.number,
  }),
]);

export type AllTimelinesResponse = runtimeTypes.TypeOf<typeof allTimelinesResponse>;

/**
 * All Timeline Saved object type with metadata
 */
export const TimelineResponseType = runtimeTypes.type({
  data: runtimeTypes.type({
    persistTimeline: runtimeTypes.intersection([
      runtimeTypes.partial({
        code: unionWithNullType(runtimeTypes.number),
        message: unionWithNullType(runtimeTypes.string),
      }),
      runtimeTypes.type({
        timeline: TimelineSavedToReturnObjectRuntimeType,
      }),
    ]),
  }),
});

export const TimelineErrorResponseType = runtimeTypes.union([
  runtimeTypes.type({
    status_code: runtimeTypes.number,
    message: runtimeTypes.string,
  }),
  runtimeTypes.type({
    statusCode: runtimeTypes.number,
    message: runtimeTypes.string,
  }),
]);

export type TimelineErrorResponse = runtimeTypes.TypeOf<typeof TimelineErrorResponseType>;
export type TimelineResponse = runtimeTypes.TypeOf<typeof TimelineResponseType>;

export enum SortFieldTimeline {
  title = 'title',
  description = 'description',
  updated = 'updated',
  created = 'created',
}

export const sortFieldTimeline = runtimeTypes.union([
  runtimeTypes.literal(SortFieldTimeline.title),
  runtimeTypes.literal(SortFieldTimeline.description),
  runtimeTypes.literal(SortFieldTimeline.updated),
  runtimeTypes.literal(SortFieldTimeline.created),
]);

export const direction = runtimeTypes.union([
  runtimeTypes.literal(Direction.asc),
  runtimeTypes.literal(Direction.desc),
]);

export const sortTimeline = runtimeTypes.type({
  sortField: sortFieldTimeline,
  sortOrder: direction,
});

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

export const importTimelineResultSchema = runtimeTypes.exact(
  runtimeTypes.type({
    success: runtimeTypes.boolean,
    success_count: PositiveInteger,
    timelines_installed: PositiveInteger,
    timelines_updated: PositiveInteger,
    errors: runtimeTypes.array(ErrorSchema),
  })
);

export type ImportTimelineResultSchema = runtimeTypes.TypeOf<typeof importTimelineResultSchema>;

const favoriteTimelineResult = runtimeTypes.partial({
  fullName: unionWithNullType(runtimeTypes.string),
  userName: unionWithNullType(runtimeTypes.string),
  favoriteDate: unionWithNullType(runtimeTypes.number),
});

export type FavoriteTimelineResult = runtimeTypes.TypeOf<typeof favoriteTimelineResult>;

export const responseFavoriteTimeline = runtimeTypes.partial({
  savedObjectId: runtimeTypes.string,
  version: runtimeTypes.string,
  code: unionWithNullType(runtimeTypes.number),
  message: unionWithNullType(runtimeTypes.string),
  templateTimelineId: unionWithNullType(runtimeTypes.string),
  templateTimelineVersion: unionWithNullType(runtimeTypes.number),
  timelineType: unionWithNullType(TimelineTypeLiteralRt),
  favorite: unionWithNullType(runtimeTypes.array(favoriteTimelineResult)),
});

export type ResponseFavoriteTimeline = runtimeTypes.TypeOf<typeof responseFavoriteTimeline>;

export const pageInfoTimeline = runtimeTypes.type({
  pageIndex: runtimeTypes.number,
  pageSize: runtimeTypes.number,
});

export interface PageInfoTimeline {
  pageIndex: number;

  pageSize: number;
}

export const getTimelinesArgs = runtimeTypes.partial({
  onlyUserFavorite: unionWithNullType(runtimeTypes.boolean),
  pageInfo: unionWithNullType(pageInfoTimeline),
  search: unionWithNullType(runtimeTypes.string),
  sort: unionWithNullType(sortTimeline),
  status: unionWithNullType(TimelineStatusLiteralRt),
  timelineType: unionWithNullType(TimelineTypeLiteralRt),
});

export type GetTimelinesArgs = runtimeTypes.TypeOf<typeof getTimelinesArgs>;

export interface ColumnHeaderResult {
  aggregatable?: Maybe<boolean>;
  category?: Maybe<string>;
  columnHeaderType?: Maybe<string>;
  description?: Maybe<string>;
  example?: Maybe<string | number>;
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

export interface SerializedKueryQueryResult {
  kuery?: Maybe<KueryFilterQueryResult>;
  serializedQuery?: Maybe<string>;
}

export interface KueryFilterQueryResult {
  kind?: Maybe<string>;
  expression?: Maybe<string>;
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
  sortOrder: Direction;
}

export interface ExportTimelineNotFoundError {
  statusCode: number;
  message: string;
}

export interface GetAllTimelineVariables {
  pageInfo: PageInfoTimeline;
  search?: Maybe<string>;
  sort?: Maybe<SortTimeline>;
  onlyUserFavorite?: Maybe<boolean>;
  timelineType?: Maybe<TimelineType>;
  status?: Maybe<TimelineStatus>;
}
