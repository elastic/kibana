/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const capabilitiesQuery = gql`
  query CapabilitiesQuery($sourceId: ID!, $nodeId: String!, $nodeType: InfraNodeType!) {
    source(id: $sourceId) {
      id
      capabilitiesByNode(nodeName: $nodeId, nodeType: $nodeType) {
        name
        source
      }
    }
  }
`;
