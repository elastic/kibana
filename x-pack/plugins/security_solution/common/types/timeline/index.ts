/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as runtimeTypes from 'io-ts';

import { stringEnum, unionWithNullType } from '../../utility_types';
import { NoteSavedObject, NoteSavedObjectToReturnRuntimeType } from './note';
import { PinnedEventToReturnSavedObjectRuntimeType, PinnedEventSavedObject } from './pinned_event';
import {
  success,
  success_count as successCount,
} from '../../detection_engine/schemas/common/schemas';
import { PositiveInteger } from '../../detection_engine/schemas/types';
import { errorSchema } from '../../detection_engine/schemas/response/error_schema';

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
  value: unionWithNullType(runtimeTypes.string),
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

export type TimelineStatusLiteral = runtimeTypes.TypeOf<typeof TimelineStatusLiteralRt>;
export type TimelineStatusLiteralWithNull = runtimeTypes.TypeOf<
  typeof TimelineStatusLiteralWithNullRt
>;

export enum RowRendererId {
  auditd = 'auditd',
  auditd_file = 'auditd_file',
  netflow = 'netflow',
  plain = 'plain',
  suricata = 'suricata',
  system = 'system',
  system_dns = 'system_dns',
  system_endgame_process = 'system_endgame_process',
  system_file = 'system_file',
  system_fim = 'system_fim',
  system_security_event = 'system_security_event',
  system_socket = 'system_socket',
  zeek = 'zeek',
}

export const RowRendererIdRuntimeType = stringEnum(RowRendererId, 'RowRendererId');

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

export const SavedTimelineRuntimeType = runtimeTypes.partial({
  columns: unionWithNullType(runtimeTypes.array(SavedColumnHeaderRuntimeType)),
  dataProviders: unionWithNullType(runtimeTypes.array(SavedDataProviderRuntimeType)),
  description: unionWithNullType(runtimeTypes.string),
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
});

export type SavedTimeline = runtimeTypes.TypeOf<typeof SavedTimelineRuntimeType>;

export type SavedTimelineNote = runtimeTypes.TypeOf<typeof SavedTimelineRuntimeType>;

/*
 *  Timeline IDs
 */

export enum TimelineId {
  hostsPageEvents = 'hosts-page-events',
  hostsPageExternalAlerts = 'hosts-page-external-alerts',
  detectionsRulesDetailsPage = 'detections-rules-details-page',
  detectionsPage = 'detections-page',
  networkPageExternalAlerts = 'network-page-external-alerts',
  active = 'timeline-1',
  casePage = 'timeline-case',
  test = 'test', // Reserved for testing purposes
}

export const TimelineIdLiteralRt = runtimeTypes.union([
  runtimeTypes.literal(TimelineId.hostsPageEvents),
  runtimeTypes.literal(TimelineId.hostsPageExternalAlerts),
  runtimeTypes.literal(TimelineId.detectionsRulesDetailsPage),
  runtimeTypes.literal(TimelineId.detectionsPage),
  runtimeTypes.literal(TimelineId.networkPageExternalAlerts),
  runtimeTypes.literal(TimelineId.active),
  runtimeTypes.literal(TimelineId.test),
]);

export type TimelineIdLiteral = runtimeTypes.TypeOf<typeof TimelineIdLiteralRt>;

/**
 * Timeline Saved object type with metadata
 */

export const TimelineSavedObjectRuntimeType = runtimeTypes.intersection([
  runtimeTypes.type({
    id: runtimeTypes.string,
    attributes: SavedTimelineRuntimeType,
    version: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    savedObjectId: runtimeTypes.string,
  }),
]);

export const TimelineSavedToReturnObjectRuntimeType = runtimeTypes.intersection([
  SavedTimelineRuntimeType,
  runtimeTypes.type({
    savedObjectId: runtimeTypes.string,
    version: runtimeTypes.string,
  }),
  runtimeTypes.partial({
    eventIdToNoteIds: runtimeTypes.array(NoteSavedObjectToReturnRuntimeType),
    noteIds: runtimeTypes.array(runtimeTypes.string),
    notes: runtimeTypes.array(NoteSavedObjectToReturnRuntimeType),
    pinnedEventIds: runtimeTypes.array(runtimeTypes.string),
    pinnedEventsSaveObject: runtimeTypes.array(PinnedEventToReturnSavedObjectRuntimeType),
  }),
]);

export type TimelineSavedObject = runtimeTypes.TypeOf<
  typeof TimelineSavedToReturnObjectRuntimeType
>;

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

export const TimelineErrorResponseType = runtimeTypes.type({
  status_code: runtimeTypes.number,
  message: runtimeTypes.string,
});

export type TimelineErrorResponse = runtimeTypes.TypeOf<typeof TimelineErrorResponseType>;
export type TimelineResponse = runtimeTypes.TypeOf<typeof TimelineResponseType>;

/**
 * All Timeline Saved object type with metadata
 */

export const AllTimelineSavedObjectRuntimeType = runtimeTypes.type({
  total: runtimeTypes.number,
  data: TimelineSavedToReturnObjectRuntimeType,
});

export type AllTimelineSavedObject = runtimeTypes.TypeOf<typeof AllTimelineSavedObjectRuntimeType>;

/**
 * Import/export timelines
 */

export type ExportedGlobalNotes = Array<Exclude<NoteSavedObject, 'eventId'>>;
export type ExportedEventNotes = NoteSavedObject[];

export interface ExportedNotes {
  eventNotes: ExportedEventNotes;
  globalNotes: ExportedGlobalNotes;
}

export type ExportedTimelines = TimelineSavedObject &
  ExportedNotes & {
    pinnedEventIds: string[];
  };

export interface ExportTimelineNotFoundError {
  statusCode: number;
  message: string;
}

export interface BulkGetInput {
  type: string;
  id: string;
}

export type NotesAndPinnedEventsByTimelineId = Record<
  string,
  { notes: NoteSavedObject[]; pinnedEvents: PinnedEventSavedObject[] }
>;

export const importTimelineResultSchema = runtimeTypes.exact(
  runtimeTypes.type({
    success,
    success_count: successCount,
    timelines_installed: PositiveInteger,
    timelines_updated: PositiveInteger,
    errors: runtimeTypes.array(errorSchema),
  })
);

export type ImportTimelineResultSchema = runtimeTypes.TypeOf<typeof importTimelineResultSchema>;

export type TimelineEventsType = 'all' | 'raw' | 'alert' | 'signal' | 'custom';

export enum TimelineTabs {
  query = 'query',
  graph = 'graph',
  notes = 'notes',
  pinned = 'pinned',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EmptyObject = Record<any, never>;

export type TimelineExpandedEventType =
  | {
      eventId: string;
      indexName: string;
    }
  | EmptyObject;

export type TimelineExpandedEvent = {
  [tab in TimelineTabs]?: TimelineExpandedEventType;
};
