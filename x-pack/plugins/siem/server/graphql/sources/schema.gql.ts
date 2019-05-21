/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const sourcesSchema = gql`
  extend type Query {
    "Get a security data source by id"
    source("The id of the source" id: ID!): Source!
    "Get a list of all security data sources"
    allSources: [Source!]!
  }

  type Source {
    "The id of the source"
    id: ID!
    "The raw configuration of the source"
    configuration: SourceConfiguration!
    "The status of the source"
    status: SourceStatus!
  }

  "The status of an infrastructure data source"
  type SourceStatus

  "A set of configuration options for a security data source"
  type SourceConfiguration {
    "The alias to read file data from"
    logAlias: String!
    "The alias to read auditbeat data from"
    auditbeatAlias: String!
    "The alias to read packetbeat data from"
    packetbeatAlias: String!
    "The alias to read winlogbeat data from"
    winlogbeatAlias: String!
    "The field mapping to use for this source"
    fields: SourceFields!
  }

  "A mapping of semantic fields to their document counterparts"
  type SourceFields {
    "The field to identify a container by"
    container: String!
    "The fields to identify a host by"
    host: String!
    "The fields that may contain the log event message. The first field found win."
    message: [String!]!
    "The field to identify a pod by"
    pod: String!
    "The field to use as a tiebreaker for log events that have identical timestamps"
    tiebreaker: String!
    "The field to use as a timestamp for metrics and logs"
    timestamp: String!
  }
`;
