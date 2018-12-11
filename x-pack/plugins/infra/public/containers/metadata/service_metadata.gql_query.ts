/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const serviceMetadataQuery = gql`
  query ServiceMetadataQuery($sourceId: ID!, $start: Float!, $end: Float!, $filterQuery: String) {
    source(id: $sourceId) {
      id
      serviceMetadataBetween(start: $start, end: $end, filterQuery: $filterQuery) {
        name
        hosts
        containers
        pods
        logs
      }
    }
  }
`;
