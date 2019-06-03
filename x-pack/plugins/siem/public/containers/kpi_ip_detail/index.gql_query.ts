/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiIpDetailsQuery = gql`
  fragment KpiIpDetailsChartFields on KpiIpDetailsHistogramData {
    x
    y
  }

  query GetKpiIpDetailsQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $filterQuery: String
    $defaultIndex: [String!]!
    $ip: String!
  ) {
    source(id: $sourceId) {
      id
      KpiIpDetails(
        timerange: $timerange
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
        ip: $ip
      ) {
        connections
        hosts
        sourcePackets
        sourcePacketsHistogram {
          ...KpiIpDetailsChartFields
        }
        sourceByte
        sourceByteHistogram {
          ...KpiIpDetailsChartFields
        }
        destinationPackets
        destinationPacketsHistogram {
          ...KpiIpDetailsChartFields
        }
        destinationByte
        destinationByteHistogram {
          ...KpiIpDetailsChartFields
        }
      }
    }
  }
`;
