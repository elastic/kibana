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
    version: Float
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
  }

  "A mapping of semantic fields to their document counterparts"
  type InfraSourceFields {
    "The field to identify a container by"
    container: String!
    "The fields to identify a host by"
    host: String!
    "The field to identify a pod by"
    pod: String!
    "The field to use as a tiebreaker for log events that have identical timestamps"
    tiebreaker: String!
    "The field to use as a timestamp for metrics and logs"
    timestamp: String!
  }

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

  "The source to be created"
  input CreateSourceInput {
    "The name of the data source"
    name: String!
    "A description of the data source"
    description: String
    "The alias to read metric data from"
    metricAlias: String
    "The alias to read log data from"
    logAlias: String
    "The field mapping to use for this source"
    fields: CreateSourceFieldsInput
  }

  "The mapping of semantic fields of the source to be created"
  input CreateSourceFieldsInput {
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

  "The result of a successful source creation"
  type CreateSourceResult {
    "The source that was created"
    source: InfraSource!
  }

  "The update operations to be performed"
  input UpdateSourceInput {
    "The name update operation to be performed"
    setName: UpdateSourceNameInput
    "The description update operation to be performed"
    setDescription: UpdateSourceDescriptionInput
    "The alias update operation to be performed"
    setAliases: UpdateSourceAliasInput
    "The field update operation to be performed"
    setFields: UpdateSourceFieldsInput
  }

  "A name update operation"
  input UpdateSourceNameInput {
    "The new name to be set"
    name: String!
  }

  "A description update operation"
  input UpdateSourceDescriptionInput {
    "The new description to be set"
    description: String!
  }

  "An alias update operation"
  input UpdateSourceAliasInput {
    "The new log index pattern or alias to bet set"
    logAlias: String
    "The new metric index pattern or alias to bet set"
    metricAlias: String
  }

  "A field update operations"
  input UpdateSourceFieldsInput {
    "The new container field to be set"
    container: String
    "The new host field to be set"
    host: String
    "The new pod field to be set"
    pod: String
    "The new tiebreaker field to be set"
    tiebreaker: String
    "The new timestamp field to be set"
    timestamp: String
  }

  "The result of a sequence of source update operations"
  type UpdateSourceResult {
    "The source after the operations were performed"
    source: InfraSource!
  }

  "The result of a source deletion operations"
  type DeleteSourceResult {
    "The id of the source that was deleted"
    id: ID!
  }

  extend type Mutation {
    "Create a new source of infrastructure data"
    createSource("The id of the source" id: ID!, source: CreateSourceInput!): CreateSourceResult!
    "Modify an existing source using the given sequence of update operations"
    updateSource(
      "The id of the source"
      id: ID!
      "A sequence of update operations"
      changes: [UpdateSourceInput!]!
    ): UpdateSourceResult!
    "Delete a source of infrastructure data"
    deleteSource("The id of the source" id: ID!): DeleteSourceResult!
  }
`;
