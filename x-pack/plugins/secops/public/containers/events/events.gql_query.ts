/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const eventsQuery = gql`
  query GetEventsQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String) {
    source(id: $sourceId) {
      getEvents(timerange: $timerange, filterQuery: $filterQuery) {
        events {
          _id
          timestamp
          event {
            type
            severity
            module
            category
            id
          }
          host {
            hostname
            ip
          }
          source {
            ip
            port
          }
          destination {
            ip
            port
          }
          geo {
            region_name
            country_iso_code
          }
          suricata {
            eve {
              proto
              flow_id
              alert {
                signature
                signature_id
              }
            }
          }
        }
        kpiEventType {
          value
          count
        }
      }
    }
  }
`;
