/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const nodesSchema: any = gql`
  type InfraHostMetrics {
    count: Int
  }

  type InfraHost {
    name: String
    type: String
    metrics: InfraHostMetrics
  }

  type InfraPodMetrics {
    count: Int
  }

  type InfraPod {
    name: String
    type: String
    metrics: InfraPodMetrics
  }

  type InfraContainerMetrics {
    count: Int
  }

  type InfraContainer {
    name: String
    type: String
    metrics: InfraContainerMetrics
  }

  type InfraServiceMetrics {
    count: Int
  }

  type InfraService {
    name: String
    type: String
    metrics: InfraServiceMetrics
  }

  input InfraIndexPattern {
    "The index pattern to use, defaults to '*'"
    pattern: String!
    "The timefield to use, defaults to @timestamp"
    timeFieldName: String!
  }

  input InfraTimerange {
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

  enum InfraMetricTypes {
    avg
    min
    max
    sum
    bucket_script
    derivative
    moving_average
    positive_only
  }

  enum InfraGroupByType {
    terms
    filters
  }

  input InfraGroupBy {
    "The UUID for the group by object"
    id: ID!
    "The type of aggregation to use to bucket the groups"
    type: InfraGroupByType!
    "The label to use in the results for the group by for the terms group by"
    label: String
    "The field to group by from a terms aggregation, this is ignored by the filter group by"
    field: String
    "The filters to use for the group by aggregation, this is ignored by the terms group by"
    filters: [InfraGroupByFilter!]
  }

  "A group by filter"
  input InfraGroupByFilter {
    "The UUID for the group by filter"
    id: ID!
    "The label for the filter, this will be used as the group name in the final results"
    label: String!
    "The query string query"
    query: String!
  }

  enum InfraFilterType {
    query_string
    match
    exists
  }

  input InfraFilter {
    "The type of filter to use"
    type: InfraFilterType!
    "The filter value"
    value: String!
    "The field name for a match query"
    field: String
  }

  type InfraGroup {
    name: String!
    groups(type: InfraGroupByType!, field: String, filters: [InfraGroupByFilter]): [InfraGroup!]
    hosts: [InfraHost!]
    pods: [InfraPod!]
    containers: [InfraContainer!]
    services: [InfraService!]
  }

  type InfraResponse {
    groups(type: InfraGroupByType!, field: String, filters: [InfraGroupByFilter]): [InfraGroup!]
    hosts: [InfraHost!]
    pods: [InfraPod!]
    containers: [InfraContainer!]
    services: [InfraService!]
  }

  extend type Query {
    map(
      indexPattern: InfraIndexPattern!
      timerange: InfraTimerange!
      filters: [InfraFilter!]
    ): InfraResponse
  }
`;
