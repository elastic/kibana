/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const metadataSchema = gql`
  "One metadata entry for a node."
  type InfraNodeMetadata {
    id: ID!
    name: String!
    features: [InfraNodeFeature!]!
  }

  type InfraNodeFeature {
    name: String!
    source: String!
  }

  extend type InfraSource {
    "A hierarchy of metadata entries by node"
    metadataByNode(nodeId: String!, nodeType: InfraNodeType!): InfraNodeMetadata!
  }
`;
