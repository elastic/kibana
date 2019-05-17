/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiHostsSchema = gql`
  type Count {
    value: Float
    doc_count: Float
  }

  type HistogramData {
    key: Float
    key_as_string: String
    count: Count
  }

  type KpiHostsData {
    hosts: Float
    hostsHistogram: [HistogramData]
    authSuccess: Float
    authSuccessHistogram: [HistogramData]
    authFailure: Float
    authFailureHistogram: [HistogramData]
    uniqueSourceIps: Float
    uniqueSourceIpsHistogram: [HistogramData]
    uniqueDestinationIps: Float
    uniqueDestinationIpsHistogram: [HistogramData]
  }

  extend type Source {
    KpiHosts(id: String, timerange: TimerangeInput!, filterQuery: String): KpiHostsData!
  }
`;
