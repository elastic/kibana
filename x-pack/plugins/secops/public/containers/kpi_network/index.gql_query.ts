/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiNetworkQuery = gql`
  query GetKpiNetworkQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String) {
    source(id: $sourceId) {
      id
      KpiNetwork(timerange: $timerange, filterQuery: $filterQuery) {
        networkEvents
        uniqueFlowId
        activeAgents
        uniqueSourcePrivateIps
        uniqueDestinationPrivateIps
        dnsQueries
        tlsHandshakes
      }
    }
  }
`;
