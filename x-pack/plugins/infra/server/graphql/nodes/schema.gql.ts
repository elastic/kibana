/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const nodesSchema: any = gql`
  type InfraNodeMetric {
    name: String!
    value: Float!
  }

  type InfraNodePath {
    value: String!
  }

  type InfraNode {
    path: [InfraNodePath!]!
    metrics(metrics: [InfraMetricInput!]): [InfraNodeMetric!]!
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
    memory
    tx
    rx
    disk
    custom
  }

  enum InfraMetricAggregationType {
    avg
    min
    max
    sum
    bucket_script
    derivative
    moving_average
    positive_only
  }

  input InfraMetricAggInput {
    "The UUID of the metric, this is used by pipeline aggregations to back reference an InfraMetricAggInput"
    id: ID!
    "The type of aggregation"
    type: InfraMetricAggregationType!
    "The field to use for the aggregation, this is only used for metric aggregations"
    field: String
    "The metric to referece for the aggregation, this is only used for pipeline aggreations"
    metric: ID
    "Additional settings for pipeline aggregations in a key:value comma delimited format"
    settings: String
    "Script field for bucket_script aggregations"
    script: String
  }

  input InfraMetricInput {
    "The type of metric"
    type: InfraMetricType!
    "The aggregations for custom metrics"
    aggs: [InfraMetricAggInput!]
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
    nodes(path: [InfraPathInput!]): [InfraNode!]!
  }

  extend type InfraSource {
    "A hierarchy of hosts, pods, containers, services or arbitrary groups"
    map(timerange: InfraTimerangeInput!, filterQuery: String): InfraResponse
  }
`;
