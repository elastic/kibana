/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

const columnHeader = `
  aggregatable: Boolean
  category: String
  columnHeaderType: String
  description: String
  example: String
  indexes: [String!]
  id: String
  name: String
  placeholder: String
  searchable: Boolean
  type: String
`;

const queryMatch = `
  field: String
  displayField: String
  value: String
  displayValue: String
  operator: String
`;

const kueryFilterQuery = `
  kind: String
  expression: String
`;

const dateRange = `
  start: Float
  end: Float
`;

const favoriteTimeline = `
  fullName: String
  userName: String
  favoriteDate: Float
`;

const sortTimeline = `
  columnId: String
  sortDirection: String
`;

const filtersMetaTimeline = `
  alias: String
  controlledBy: String
  disabled: Boolean
  field: String
  formattedValue: String
  index: String
  key: String
  negate: Boolean
  params: String
  type: String
  value: String
`;

export const timelineSchema = gql`
  ###############
  #### INPUT ####
  ###############

  input ColumnHeaderInput {
    ${columnHeader}
  }

  input QueryMatchInput {
    ${queryMatch}
  }

  input DataProviderInput {
    id: String
    name: String
    enabled: Boolean
    excluded: Boolean
    kqlQuery: String
    queryMatch: QueryMatchInput
    and: [DataProviderInput!]
  }

  input KueryFilterQueryInput {
    ${kueryFilterQuery}
  }

  input SerializedKueryQueryInput {
    kuery: KueryFilterQueryInput
    serializedQuery: String
  }

  input SerializedFilterQueryInput {
    filterQuery: SerializedKueryQueryInput
  }

  input DateRangePickerInput {
    ${dateRange}
  }

  input FavoriteTimelineInput {
    ${favoriteTimeline}
  }

  input SortTimelineInput {
    ${sortTimeline}
  }

  input FilterMetaTimelineInput {
    ${filtersMetaTimeline}
  }

  input FilterTimelineInput {
    exists: String
    meta: FilterMetaTimelineInput
    match_all: String
    missing: String
    query: String
    range: String
    script: String
  }

  enum TimelineType {
    default
    template
  }

  enum TimelineStatus {
    active
    draft
    immutable
  }

  enum TemplateTimelineType {
    elastic
    custom
  }

  input TimelineInput {
    columns: [ColumnHeaderInput!]
    dataProviders: [DataProviderInput!]
    description: String
    eventType: String
    filters: [FilterTimelineInput!]
    kqlMode: String
    kqlQuery: SerializedFilterQueryInput
    title: String
    templateTimelineId: String
    templateTimelineVersion: Int
    timelineType: TimelineType
    dateRange: DateRangePickerInput
    savedQueryId: String
    sort: SortTimelineInput
    status: TimelineStatus
  }

  input PageInfoTimeline {
    pageIndex: Float!
    pageSize: Float!
  }

  enum SortFieldTimeline {
    title
    description
    updated
    created
  }

  input SortTimeline {
    sortField: SortFieldTimeline!
    sortOrder: Direction!
  }

  ###############
  #### QUERY ####
  ###############
  type ColumnHeaderResult {
    ${columnHeader}
  }

  type QueryMatchResult {
    ${queryMatch}
  }

  type DataProviderResult {
    id: String
    name: String
    enabled: Boolean
    excluded: Boolean
    kqlQuery: String
    queryMatch: QueryMatchResult
    and: [DataProviderResult!]
  }

  type KueryFilterQueryResult {
    ${kueryFilterQuery}
  }

  type SerializedKueryQueryResult {
    kuery: KueryFilterQueryResult
    serializedQuery: String
  }

  type SerializedFilterQueryResult {
    filterQuery: SerializedKueryQueryResult
  }

  type DateRangePickerResult {
    ${dateRange}
  }

  type FavoriteTimelineResult {
    ${favoriteTimeline}
  }

  type SortTimelineResult {
     ${sortTimeline}
  }

  type FilterMetaTimelineResult {
    ${filtersMetaTimeline}
  }

  type FilterTimelineResult {
    exists: String
    meta: FilterMetaTimelineResult
    match_all: String
    missing: String
    query: String
    range: String
    script: String
  }

  type TimelineResult {
    columns: [ColumnHeaderResult!]
    created: Float
    createdBy: String
    dataProviders: [DataProviderResult!]
    dateRange: DateRangePickerResult
    description: String
    eventIdToNoteIds: [NoteResult!]
    eventType: String
    favorite: [FavoriteTimelineResult!]
    filters: [FilterTimelineResult!]
    kqlMode: String
    kqlQuery: SerializedFilterQueryResult
    notes: [NoteResult!]
    noteIds: [String!]
    pinnedEventIds: [String!]
    pinnedEventsSaveObject: [PinnedEvent!]
    savedQueryId: String
    savedObjectId: String!
    sort: SortTimelineResult
    status: TimelineStatus
    title: String
    templateTimelineId: String
    templateTimelineVersion: Int
    timelineType: TimelineType
    updated: Float
    updatedBy: String
    version: String!
  }

  type ResponseTimeline {
    code: Float
    message: String
    timeline: TimelineResult!
  }

  type ResponseFavoriteTimeline {
    code: Float
    message: String
    savedObjectId: String!
    version: String!
    favorite: [FavoriteTimelineResult!]
  }

  type ResponseTimelines {
    timeline: [TimelineResult]!
    totalCount: Float
    defaultTimelineCount: Float
    templateTimelineCount: Float
    elasticTemplateTimelineCount: Float
    customTemplateTimelineCount: Float
    favoriteCount: Float
  }

  #########################
  ####  Mutation/Query ####
  #########################

  extend type Query {
    getOneTimeline(id: ID!): TimelineResult!
    getAllTimeline(pageInfo: PageInfoTimeline, search: String, sort: SortTimeline, onlyUserFavorite: Boolean, timelineType: TimelineType, templateTimelineType: TemplateTimelineType, status: TimelineStatus): ResponseTimelines!
  }

  extend type Mutation {
    "Persists a timeline"
    persistTimeline(id: ID, version: String, timeline: TimelineInput!): ResponseTimeline!
    persistFavorite(timelineId: ID): ResponseFavoriteTimeline!
    deleteTimeline(id: [ID!]!): Boolean!
  }
`;
