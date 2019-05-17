/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiHostsQuery = gql`
  fragment ChartFields on HistogramData {
    x: key_as_string
    y: count {
      value
      doc_count
    }
  }

  query GetKpiHostsQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String) {
    source(id: $sourceId) {
      id
      KpiHosts(timerange: $timerange, filterQuery: $filterQuery) {
        hosts
        hostsHistogram {
          ...ChartFields
        }
        authSuccess
        authSuccessHistogram {
          ...ChartFields
        }
        authFailure
        authFailureHistogram {
          ...ChartFields
        }
        uniqueSourceIps
        uniqueSourceIpsHistogram {
          ...ChartFields
        }
        uniqueDestinationIps
        uniqueDestinationIpsHistogram {
          ...ChartFields
        }
      }
    }
  }
`;
