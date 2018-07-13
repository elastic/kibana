/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const fieldsSchema = gql`
  interface InfraField {
    name: String
    type: String
    searchable: Boolean
    aggregatable: Boolean
  }

  extend type Query {
    fields(
      indexPattern: InfraIndexPattern = {
        pattern: "metricbeat_read_only"
        timeFieldName: "@timestamp"
      }
    ): [InfraField]
  }
`;
