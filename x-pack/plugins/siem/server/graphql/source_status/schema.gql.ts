/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const sourceStatusSchema = gql`
  "A descriptor of a field in an index"
  type IndexField {
    "Where the field belong"
    category: String!
    "Example of field's value"
    example: String
    "whether the field's belong to an alias index"
    indexes: [String]!
    "The name of the field"
    name: String!
    "The type of the field's values as recognized by Kibana"
    type: String!
    "Whether the field's values can be efficiently searched for"
    searchable: Boolean!
    "Whether the field's values can be aggregated"
    aggregatable: Boolean!
    "Description of the field"
    description: String
  }

  extend type SourceStatus {
    "Whether the configured auditbeat alias exists"
    auditbeatAliasExists: Boolean!
    "Whether the configured alias or wildcard pattern resolve to any auditbeat indices"
    auditbeatIndicesExist: Boolean!
    "The list of indices in the auditbeat alias"
    auditbeatIndices: [String!]!
    "Whether the configured filebeat alias exists"
    filebeatAliasExists: Boolean!
    "Whether the configured alias or wildcard pattern resolve to any filebeat indices"
    filebeatIndicesExist: Boolean!
    "The list of indices in the filebeat alias"
    filebeatIndices: [String!]!
    "Whether the configured packetbeat alias exists"
    packetbeatAliasExists: Boolean!
    "Whether the configured alias or wildcard pattern resolve to any packetbeat indices"
    packetbeatIndicesExist: Boolean!
    "The list of indices in the packetbeat alias"
    packetbeatIndices: [String!]!
    "Whether the configured winlogbeat alias exists"
    winlogbeatAliasExists: Boolean!
    "Whether the configured alias or wildcard pattern resolve to any winlogbeat indices"
    winlogbeatIndicesExist: Boolean!
    "The list of indices in the winlogbeat alias"
    winlogbeatIndices: [String!]!
    "The list of fields defined in the index mappings"
    indexFields(indexTypes: [IndexType!] = [ANY]): [IndexField!]!
  }
`;
