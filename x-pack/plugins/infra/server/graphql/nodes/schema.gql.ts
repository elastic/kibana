/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const nodesSchema: any = gql`
  type InfraNodeMetric {
    name: InfraMetricType!
    value: Float!
  }

  type InfraNodePath {
    value: String!
  }

  type InfraNode {
    path: [InfraNodePath!]!
    metric: InfraNodeMetric!
  }

  input InfraTimerangeInput {
    "The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan."
    interval: String!
    "The end of the timerange"
    to: Float!
    "The beginning of the timerange"
    from: Float!
  }

  enum InfraOperator {
    gt
    gte
    lt
    lte
    eq
  }

  enum InfraMetricType {
    count
    cpu
    load
    memory
    tx
    rx
    logRate
  }

  input InfraMetricInput {
    "The type of metric"
    type: InfraMetricType!
  }

  enum InfraPathType {
    terms
    filters
    hosts
    pods
    containers
  }

  input InfraPathInput {
    "The type of path"
    type: InfraPathType!
    "The label to use in the results for the group by for the terms group by"
    label: String
    "The field to group by from a terms aggregation, this is ignored by the filter type"
    field: String
    "The fitlers for the filter group by"
    filters: [InfraPathFilterInput!]
  }

  "A group by filter"
  input InfraPathFilterInput {
    "The label for the filter, this will be used as the group name in the final results"
    label: String!
    "The query string query"
    query: String!
  }

  type InfraResponse {
    nodes(path: [InfraPathInput!]!, metric: InfraMetricInput!): [InfraNode!]!
  }

  extend type InfraSource {
    "A hierarchy of hosts, pods, containers, services or arbitrary groups"
    map(timerange: InfraTimerangeInput!, filterQuery: String): InfraResponse
  }
`;
