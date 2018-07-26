/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const logEntriesSchema = gql`
  type InfraTimeKey {
    time: Float!
    tiebreaker: Float!
  }

  input InfraTimeKeyInput {
    time: Float!
    tiebreaker: Float!
  }

  type InfraLogMessageFieldSegment {
    field: String!
    value: String!
    highlights: [String!]!
  }

  type InfraLogMessageConstantSegment {
    constant: String!
  }

  union InfraLogMessageSegment = InfraLogMessageFieldSegment | InfraLogMessageConstantSegment

  type InfraLogEntry {
    key: InfraTimeKey!
    gid: String!
    source: String!
    message: [InfraLogMessageSegment!]!
  }

  type InfraLogEntryInterval {
    start: InfraTimeKey
    end: InfraTimeKey
    filterQuery: String
    highlightQuery: String
    entries: [InfraLogEntry!]!
  }

  extend type InfraSource {
    logEntriesAfter(
      key: InfraTimeKeyInput!
      count: Int!
      filterQuery: String
      highlightQuery: String
    ): InfraLogEntryInterval!
    logEntriesBefore(
      key: InfraTimeKeyInput!
      count: Int!
      filterQuery: String
      highlightQuery: String
    ): InfraLogEntryInterval!
    logEntriesBetween(
      startKey: InfraTimeKeyInput!
      endKey: InfraTimeKeyInput!
      filterQuery: String
      highlightQuery: String
    ): InfraLogEntryInterval!
  }
`;
