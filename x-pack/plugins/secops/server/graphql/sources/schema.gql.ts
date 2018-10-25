/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const sourcesSchema = gql`
  type Source {
    "The id of the source"
    id: ID!
  }

  extend type Query {
    "Get an infrastructure data source by id"
    source("The id of the source" id: ID!): Source!
    "Get a list of all infrastructure data sources"
    allSources: [Source!]!
  }
`;
