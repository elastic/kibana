/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiNetworkQuery = gql`
  fragment KpiNetworkChartFields on KpiNetworkHistogramData {
    key_as_string
    doc_count
    count {
      value
    }
  }

  query GetKpiNetworkQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $filterQuery: String
    $defaultIndex: [String!]!
  ) {
    source(id: $sourceId) {
      id
      KpiNetwork(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
        networkEvents
        networkEventsHistogram {
          ...KpiNetworkChartFields
        }
        uniqueFlowId
        activeAgents
        uniqueSourcePrivateIps
        uniqueSourcePrivateIpsHistogram {
          ...KpiNetworkChartFields
        }
        uniqueDestinationPrivateIps
        uniqueDestinationPrivateIpsHistogram {
          ...KpiNetworkChartFields
        }
        dnsQueries
        tlsHandshakes
      }
    }
  }
`;
