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
    "The raw configuration of the source"
    configuration: InfraSourceConfiguration!
    "The status of the source"
    status: InfraSourceStatus!
  }

  "The status of an infrastructure data source"
  type InfraSourceStatus

  "A set of configuration options for an infrastructure data source"
  type InfraSourceConfiguration {
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
    "The fields that may contain the log event message. The first field found win."
    message: [String!]!
    "The field to identify a pod by"
    pod: String!
    "The field to use as a tiebreaker for log events that have identical timestamps"
    tiebreaker: String!
    "The field to use as a timestamp for metrics and logs"
    timestamp: String!
  }

  extend type Query {
    "Get an infrastructure data source by id"
    source("The id of the source" id: ID!): InfraSource!
    "Get a list of all infrastructure data sources"
    allSources: [InfraSource!]!
  }
`;
