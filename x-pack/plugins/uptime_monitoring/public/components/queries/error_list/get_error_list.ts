/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const getErrorListQuery = gql`
  query ErrorList(
    $dateRangeStart: UnsignedInteger!
    $dateRangeEnd: UnsignedInteger!
    $filters: String
  ) {
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
