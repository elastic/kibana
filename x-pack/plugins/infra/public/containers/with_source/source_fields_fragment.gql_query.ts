/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const sourceFieldsFragment = gql`
  fragment SourceFields on InfraSource {
    id
    version
    updatedAt
    configuration {
      name
      description
      metricAlias
      logAlias
      fields {
        container
        host
        pod
        tiebreaker
        timestamp
      }
    }
    status {
      indexFields {
        name
        type
        searchable
        aggregatable
      }
      logIndicesExist
      metricIndicesExist
    }
  }
`;
