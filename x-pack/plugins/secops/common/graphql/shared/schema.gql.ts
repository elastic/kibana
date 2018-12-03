/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const sharedSchema = gql`
  input TimerangeInput {
    "The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan."
    interval: String!
    "The end of the timerange"
    to: Float!
    "The beginning of the timerange"
    from: Float!
  }

  input PaginationInput {
    "The size parameter allows you to configure the maximum amount of items to be returned"
    size: Int!
    "The page parameter defines the offset from the first result you want to fetch"
    page: Int!
  }

  enum IndexType {
    ANY
    LOGS
    AUDITBEAT
  }
`;
