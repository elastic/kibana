/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const metadataSchema = gql`
  "One metadata entry for a node."
  type InfraNodeMetadata {
    name: String!
    source: String!
  }

  extend type InfraSource {
    "A hierarchy of metadata entries by node"
    metadataByNode(nodeName: String!, nodeType: InfraNodeType!): [InfraNodeMetadata]!
  }
`;
