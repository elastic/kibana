/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const filterBarQueryString = `
query FilterBar($dateRangeStart: String!, $dateRangeEnd: String!) {
  filterBar: getFilterBar(dateRangeStart: $dateRangeStart, dateRangeEnd: $dateRangeEnd) {
    ids {
      key
      url
    }
    locations
    names
    ports
    schemes
  }
}
`;

export const filterBarQuery = gql`
  ${filterBarQueryString}
`;
