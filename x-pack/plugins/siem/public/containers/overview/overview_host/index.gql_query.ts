/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const overviewHostQuery = gql`
  query GetOverviewHostQuery($sourceId: ID!, $timerange: TimerangeInput!, $filterQuery: String) {
    source(id: $sourceId) {
      id
      OverviewHost(timerange: $timerange, filterQuery: $filterQuery) {
        auditbeatAuditd
        auditbeatFIM
        auditbeatLogin
        auditbeatPackage
        auditbeatProcess
        auditbeatUser
      }
    }
  }
`;
