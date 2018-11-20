/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const metadataSchema = gql`
  "One metadata entry for a node"
  type InfraNodeMetadata {
    name: String!
    source: String!
  }

  type ServiceMetadata {
    "One metadata entry for a service"
    name: String!
    hosts: Boolean!
    pods: Boolean!
    containers: Boolean!
    logs: Boolean!
  }

  extend type InfraSource {
    "A hierarchy of metadata entries by node"
    metadataByNode(
      "The name of the node"
      nodeName: String!
      "The type of the node."
      nodeType: InfraNodeType!
    ): [InfraNodeMetadata]!
    serviceMetadataBetween(
      "The millisecond timestamp that corresponds to the start of the interval"
      start: Float!
      "The millisecond timestamp that corresponds to the end of the interval"
      end: Float!
      "The query to filter the documents by based on which service metadata will be returned"
      filterQuery: String
    ): [ServiceMetadata]!
  }
`;
