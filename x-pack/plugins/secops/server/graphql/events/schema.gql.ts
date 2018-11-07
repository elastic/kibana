/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const eventsSchema = gql`
  input TimerangeInput {
    "The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan."
    interval: String!
    "The end of the timerange"
    to: Float!
    "The beginning of the timerange"
    from: Float!
  }

  type KpiItem {
    value: String!
    count: Float!
  }

  type EventEcsFields {
    type: String
    severity: Float
  }

  type GeoEcsFields {
    country_iso_code: String
    region_name: String
  }

  type HostEcsFields {
    hostname: String
    ip: String
  }

  type SourceEcsFields {
    ip: String
    port: String
  }

  type DestinationEcsFields {
    ip: String
    port: String
  }

  type SuricataEcsFields {
    flow_id: String
    proto: String
  }

  type EventItem {
    timestamp: String
    host: HostEcsFields
    event: EventEcsFields
    source: SourceEcsFields
    destination: DestinationEcsFields
    geo: GeoEcsFields
    suricata: SuricataEcsFields
  }

  type EventsData {
    kpiEventType: [KpiItem!]!
    events: [EventItem!]!
  }

  extend type Source {
    "Gets Suricata events based on timerange and specified criteria, or all events in the timerange if no criteria is specified"
    getEvents(timerange: TimerangeInput!, filterQuery: String): EventsData
  }
`;
