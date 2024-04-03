/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as runtimeTypes from 'io-ts';

import { stringEnum, unionWithNullType } from '../../utility_types';

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

enum DataProviderType {
  default = 'default',
  template = 'template',
}

const DataProviderTypeLiteralRt = runtimeTypes.union([
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

/*
 *  Timeline Statuses
 */

export enum SavedObjectTimelineStatus {
  active = 'active',
  draft = 'draft',
  immutable = 'immutable',
}

const TimelineStatusLiteralRt = runtimeTypes.union([
  runtimeTypes.literal(SavedObjectTimelineStatus.active),
  runtimeTypes.literal(SavedObjectTimelineStatus.draft),
  runtimeTypes.literal(SavedObjectTimelineStatus.immutable),
]);

enum RowRendererId {
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

/*
 *  Saved Object Timeline Types
 */

export enum SavedObjectTimelineType {
  default = 'default',
  template = 'template',
}

const SavedObjectTimelineTypeLiteralRt = runtimeTypes.union([
  runtimeTypes.literal(SavedObjectTimelineType.template),
  runtimeTypes.literal(SavedObjectTimelineType.default),
]);

export const SavedObjectTimelineTypeLiteralWithNullRt = unionWithNullType(
  SavedObjectTimelineTypeLiteralRt
);

export const SavedObjectTimelineRuntimeType = runtimeTypes.partial({
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
  timelineType: unionWithNullType(SavedObjectTimelineTypeLiteralRt),
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
type SavedObjectTimeline = runtimeTypes.TypeOf<typeof SavedObjectTimelineRuntimeType>;

/**
 * This type represents a timeline type stored in a saved object that does not include any fields that reference
 * other saved objects.
 */
export type SavedObjectTimelineWithoutExternalRefs = Omit<
  SavedObjectTimeline,
  'dataViewId' | 'savedQueryId'
>;
