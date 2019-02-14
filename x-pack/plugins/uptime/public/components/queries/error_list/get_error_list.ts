/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const getErrorListQueryString = `
query ErrorList($dateRangeStart: String!, $dateRangeEnd: String!, $filters: String) {
  errorList: getErrorsList(
    dateRangeStart: $dateRangeStart
    dateRangeEnd: $dateRangeEnd
    filters: $filters
  ) {
    latestMessage
    monitorId
    type
    count
    statusCode
    timestamp
  }
}
`;

export const getErrorListQuery = gql`
  ${getErrorListQueryString}
`;
