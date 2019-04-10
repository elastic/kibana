/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiHostsSchema = gql`
  type KpiHostsData {
    hosts: Float
    installedPackages: Float
    processCount: Float
    authenticationSuccess: Float
    authenticationFailure: Float
    fimEvents: Float
    auditdEvents: Float
    winlogbeatEvents: Float
    filebeatEvents: Float
    sockets: Float
    uniqueSourceIps: Float
    uniqueDestinationIps: Float
  }

  extend type Source {
    KpiHosts(id: String, timerange: TimerangeInput!, filterQuery: String): KpiHostsData
  }
`;
