/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const sharedSchema = gql`
  "A representation of the log entry's position in the event stream"
  type InfraTimeKey {
    "The timestamp of the event that the log entry corresponds to"
    time: Float!
    "The tiebreaker that disambiguates events with the same timestamp"
    tiebreaker: Float!
  }

  input InfraTimeKeyInput {
    time: Float!
    tiebreaker: Float!
  }

  enum InfraIndexType {
    ANY
    LOGS
    METRICS
  }

  enum InfraNodeType {
    pod
    container
    host
    awsEC2
    awsS3
    awsRDS
    awsSQS
  }
`;
