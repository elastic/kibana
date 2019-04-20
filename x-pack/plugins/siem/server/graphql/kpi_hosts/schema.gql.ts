/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiHostsSchema = gql`
  type authenticationData {
    success: Float
    failure: Float
  }

  type KpiHostsData {
    hosts: Float
    agents: Float
    authentication: authenticationData!
    uniqueSourceIps: Float
    uniqueDestinationIps: Float
  }

  extend type Source {
    KpiHosts(id: String, timerange: TimerangeInput!, filterQuery: String): KpiHostsData!
  }
`;
