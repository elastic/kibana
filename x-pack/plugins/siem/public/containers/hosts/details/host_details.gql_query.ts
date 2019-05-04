/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const HostDetailsQuery = gql`
  query GetHostDetailsQuery($sourceId: ID!, $hostName: String!, $timerange: TimerangeInput!) {
    source(id: $sourceId) {
      id
      HostDetails(hostName: $hostName, timerange: $timerange) {
        _id
        host {
          architecture
          id
          ip
          mac
          name
          os {
            family
            name
            platform
            version
          }
          type
        }
      }
    }
  }
`;
