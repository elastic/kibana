/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const logEntriesSchema = gql`
  "A representation of the log entry's position in the event stream"
  type InfraTimeKey {
    "The timestamp of the event that the log entry corresponds to"
    time: Float!
    "The tiebreaker that disambiguates events with the same timestamp"
    tiebreaker: Float!
  }

  input InfraTimeKeyInput {
    time: Float!
    tiebreaker: Float!
  }

  "A segment of the log entry message that was derived from a field"
  type InfraLogMessageFieldSegment {
    "The field the segment was derived from"
    field: String!
    "The segment's message"
    value: String!
    "A list of highlighted substrings of the value"
    highlights: [String!]!
  }

  "A segment of the log entry message that was derived from a field"
  type InfraLogMessageConstantSegment {
    "The segment's message"
    constant: String!
  }

  "A segment of the log entry message"
  union InfraLogMessageSegment = InfraLogMessageFieldSegment | InfraLogMessageConstantSegment

  "A log entry"
  type InfraLogEntry {
    "A unique representation of the log entry's position in the event stream"
    key: InfraTimeKey!
    "The log entry's id"
    gid: String!
    "The source id"
    source: String!
    "A list of the formatted log entry segments"
    message: [InfraLogMessageSegment!]!
  }

  "A consecutive sequence of log entries"
  type InfraLogEntryInterval {
    "The key corresponding to the start of the interval covered by the entries"
    start: InfraTimeKey
    "The key corresponding to the end of the interval covered by the entries"
    end: InfraTimeKey
    "The query the log entries were filtered by"
    filterQuery: String
    "The query the log entries were highlighted with"
    highlightQuery: String
    "A list of the log entries"
    entries: [InfraLogEntry!]!
  }

  extend type InfraSource {
    "A consecutive span of log entries following a point in time"
    logEntriesAfter(
      "The sort key that corresponds to the point in time"
      key: InfraTimeKeyInput!
      "The maximum number of entries to return"
      count: Int!
      "The query to filter the log entries by"
      filterQuery: String
      "The query to highlight the log entries with"
      highlightQuery: String
    ): InfraLogEntryInterval!
    "A consecutive span of log entries preceding a point in time"
    logEntriesBefore(
      "The sort key that corresponds to the point in time"
      key: InfraTimeKeyInput!
      "The maximum number of entries to return"
      count: Int!
      "The query to filter the log entries by"
      filterQuery: String
      "The query to highlight the log entries with"
      highlightQuery: String
    ): InfraLogEntryInterval!
    "A consecutive span of log entries within an interval"
    logEntriesBetween(
      "The sort key that corresponds to the start of the interval"
      startKey: InfraTimeKeyInput!
      "The sort key that corresponds to the end of the interval"
      endKey: InfraTimeKeyInput!
      "The query to filter the log entries by"
      filterQuery: String
      "The query to highlight the log entries with"
      highlightQuery: String
    ): InfraLogEntryInterval!
  }
`;
