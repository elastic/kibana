/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiHostsQuery = gql`
  query GetKpiHostsQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String) {
    source(id: $sourceId) {
      id
      KpiHosts(timerange: $timerange, filterQuery: $filterQuery) {
        hosts
        hostsHistogram {
          x: key
          y: doc_count
        }
        authSuccess
        authSuccessHistogram {
          x: key
          y: doc_count
        }
        authFailure
        authFailureHistogram {
          x: key
          y: doc_count
        }
        uniqueSourceIps
        uniqueSourceIpsHistogram {
          x: key
          y: doc_count
        }
        uniqueDestinationIps
        uniqueDestinationIpsHistogram {
          x: key
          y: doc_count
        }
      }
    }
  }
`;
