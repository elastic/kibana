/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

import { sourceFieldsFragment } from './source_fields_fragment.gql_query';

export const updateSourceMutation = gql`
  mutation UpdateSourceMutation($sourceId: ID = "default", $changes: [UpdateSourceInput!]!) {
    updateSource(id: $sourceId, changes: $changes) {
      source {
        ...SourceFields
      }
    }
  }

  ${sourceFieldsFragment}
`;
