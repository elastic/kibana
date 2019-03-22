/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const ipOverviewQuery = gql`
  query GetIpOverviewQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $filterQuery: String
    $ip: String!
  ) {
    source(id: $sourceId) {
      id
      IpOverview(timerange: $timerange, filterQuery: $filterQuery, ip: $ip) {
        source {
          firstSeen
          lastSeen
          geo {
            continent_name
            city_name
            country_iso_code
            country_name
            location {
              lat
              lon
            }
            region_iso_code
            region_name
          }
        }
        destination {
          firstSeen
          lastSeen
          geo {
            continent_name
            city_name
            country_iso_code
            country_name
            location {
              lat
              lon
            }
            region_iso_code
            region_name
          }
        }
      }
    }
  }
`;
