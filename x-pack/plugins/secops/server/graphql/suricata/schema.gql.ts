/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const suricataSchema = gql`
  input TimerangeInput {
    "The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan."
    interval: String!
    "The end of the timerange"
    to: Float!
    "The beginning of the timerange"
    from: Float!
  }

  type SuricataEvents {
    timestamp: String!
    eventType: String!
    flowId: String!
    proto: String!
    srcIp: String!
    srcPort: Float!
    destIp: String!
    destPort: Float!
    geoRegionName: String!
    geoCountryIsoCode: String!
  }

  extend type Source {
    "Gets Suricata events based on timerange and specified criteria, or all events in the timerange if no criteria is specified"
    getSuricataEvents(timerange: TimerangeInput!, filterQuery: String): [SuricataEvents!]!
  }
`;
