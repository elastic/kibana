/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiEventsQuery = gql`
  query GetKpiEventsQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $filterQuery: String
    $pagination: PaginationInput!
    $sortField: SortField!
  ) {
    source(id: $sourceId) {
      id
      Events(
        timerange: $timerange
        filterQuery: $filterQuery
        pagination: $pagination
        sortField: $sortField
      ) {
        kpiEventType {
          value
          count
        }
      }
    }
  }
`;
