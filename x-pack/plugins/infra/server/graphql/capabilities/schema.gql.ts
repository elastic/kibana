/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const capabilitiesSchema = gql`
  "One specific capability available on a node. A capability corresponds to a fileset or metricset"
  type InfraNodeCapability {
    name: String!
    source: String!
  }

  extend type InfraSource {
    "A hierarchy of capabilities available on nodes"
    capabilitiesByNode(nodeName: String!, nodeType: InfraNodeType!): [InfraNodeCapability]!
  }
`;
