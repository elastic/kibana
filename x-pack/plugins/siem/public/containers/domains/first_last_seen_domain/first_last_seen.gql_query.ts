/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const DomainFirstLastSeenGqlQuery = gql`
  query GetDomainFirstLastSeenQuery(
    $sourceId: ID!
    $ip: String!
    $domainName: String!
    $flowTarget: FlowTarget!
  ) {
    source(id: $sourceId) {
      id
      DomainFirstLastSeen(ip: $ip, domainName: $domainName, flowTarget: $flowTarget) {
        firstSeen
        lastSeen
      }
    }
  }
`;
