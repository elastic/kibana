/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const sourcesSchema = gql`
  type InfraSource {
    id: ID!
    configuration: InfraSourceConfiguration!
  }

  type InfraSourceConfiguration {
    metricAlias: String!
    logAlias: String!
    fields: InfraSourceFields!
  }

  type InfraSourceFields {
    container: String!
    hostname: String!
    message: [String!]!
    pod: String!
    tiebreaker: String!
    timestamp: String!
  }

  extend type Query {
    source(id: ID!): InfraSource!
    allSources: [InfraSource!]!
  }
`;
