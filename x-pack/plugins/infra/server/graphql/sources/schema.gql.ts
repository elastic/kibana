/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const sourcesSchema = gql`
  "A source of infrastructure data"
  type InfraSource {
    "The id of the source"
    id: ID!
    "The version number the source configuration was last persisted with"
    version: String
    "The timestamp the source configuration was last persisted at"
    updatedAt: Float
    "The raw configuration of the source"
    configuration: InfraSourceConfiguration!
    "The status of the source"
    status: InfraSourceStatus!
  }

  "The status of an infrastructure data source"
  type InfraSourceStatus

  "A set of configuration options for an infrastructure data source"
  type InfraSourceConfiguration {
    "The name of the data source"
    name: String!
    "A description of the data source"
    description: String!
    "The alias to read metric data from"
    metricAlias: String!
    "The alias to read log data from"
    logAlias: String!
    "The field mapping to use for this source"
    fields: InfraSourceFields!
    "The columns to use for log display"
    logColumns: [InfraSourceLogColumn!]!
  }

  "A mapping of semantic fields to their document counterparts"
  type InfraSourceFields {
    "The field to identify a container by"
    container: String!
    "The fields to identify a host by"
    host: String!
    "The fields to use as the log message"
    message: [String!]!
    "The field to identify a pod by"
    pod: String!
    "The field to use as a tiebreaker for log events that have identical timestamps"
    tiebreaker: String!
    "The field to use as a timestamp for metrics and logs"
    timestamp: String!
  }

  "The built-in timestamp log column"
  type InfraSourceTimestampLogColumn {
    timestampColumn: InfraSourceTimestampLogColumnAttributes!
  }

  type InfraSourceTimestampLogColumnAttributes {
    "A unique id for the column"
    id: ID!
  }

  "The built-in message log column"
  type InfraSourceMessageLogColumn {
    messageColumn: InfraSourceMessageLogColumnAttributes!
  }

  type InfraSourceMessageLogColumnAttributes {
    "A unique id for the column"
    id: ID!
  }

  "A log column containing a field value"
  type InfraSourceFieldLogColumn {
    fieldColumn: InfraSourceFieldLogColumnAttributes!
  }

  type InfraSourceFieldLogColumnAttributes {
    "A unique id for the column"
    id: ID!
    "The field name this column refers to"
    field: String!
  }

  "All known log column types"
  union InfraSourceLogColumn =
      InfraSourceTimestampLogColumn
    | InfraSourceMessageLogColumn
    | InfraSourceFieldLogColumn

  extend type Query {
    """
    Get an infrastructure data source by id.

    The resolution order for the source configuration attributes is as follows
    with the first defined value winning:

    1. The attributes of the saved object with the given 'id'.
    2. The attributes defined in the static Kibana configuration key
       'xpack.infra.sources.default'.
    3. The hard-coded default values.

    As a consequence, querying a source that doesn't exist doesn't error out,
    but returns the configured or hardcoded defaults.
    """
    source("The id of the source" id: ID!): InfraSource!
    "Get a list of all infrastructure data sources"
    allSources: [InfraSource!]!
  }

  "The properties to update the source with"
  input UpdateSourceInput {
    "The name of the data source"
    name: String
    "A description of the data source"
    description: String
    "The alias to read metric data from"
    metricAlias: String
    "The alias to read log data from"
    logAlias: String
    "The field mapping to use for this source"
    fields: UpdateSourceFieldsInput
    "The log columns to display for this source"
    logColumns: [UpdateSourceLogColumnInput!]
  }

  "The mapping of semantic fields of the source to be created"
  input UpdateSourceFieldsInput {
    "The field to identify a container by"
    container: String
    "The fields to identify a host by"
    host: String
    "The field to identify a pod by"
    pod: String
    "The field to use as a tiebreaker for log events that have identical timestamps"
    tiebreaker: String
    "The field to use as a timestamp for metrics and logs"
    timestamp: String
  }

  "One of the log column types to display for this source"
  input UpdateSourceLogColumnInput {
    "A custom field log column"
    fieldColumn: UpdateSourceFieldLogColumnInput
    "A built-in message log column"
    messageColumn: UpdateSourceMessageLogColumnInput
    "A built-in timestamp log column"
    timestampColumn: UpdateSourceTimestampLogColumnInput
  }

  input UpdateSourceFieldLogColumnInput {
    id: ID!
    field: String!
  }

  input UpdateSourceMessageLogColumnInput {
    id: ID!
  }

  input UpdateSourceTimestampLogColumnInput {
    id: ID!
  }

  "The result of a successful source update"
  type UpdateSourceResult {
    "The source that was updated"
    source: InfraSource!
  }

  "The result of a source deletion operations"
  type DeleteSourceResult {
    "The id of the source that was deleted"
    id: ID!
  }

  extend type Mutation {
    "Create a new source of infrastructure data"
    createSource(
      "The id of the source"
      id: ID!
      sourceProperties: UpdateSourceInput!
    ): UpdateSourceResult!
    "Modify an existing source"
    updateSource(
      "The id of the source"
      id: ID!
      "The properties to update the source with"
      sourceProperties: UpdateSourceInput!
    ): UpdateSourceResult!
    "Delete a source of infrastructure data"
    deleteSource("The id of the source" id: ID!): DeleteSourceResult!
  }
`;
