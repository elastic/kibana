/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

import { sharedFragments } from '../../../common/graphql/shared';
import {
  sourceConfigurationFieldsFragment,
  sourceStatusFieldsFragment,
} from './source_fields_fragment.gql_query';

export const createSourceMutation = gql`
  mutation CreateSourceConfigurationMutation(
    $sourceId: ID!
    $sourceProperties: UpdateSourceInput!
  ) {
    createSource(id: $sourceId, sourceProperties: $sourceProperties) {
      source {
        ...InfraSourceFields
        configuration {
          ...SourceConfigurationFields
        }
        status {
          ...SourceStatusFields
        }
      }
    }
  }

  ${sharedFragments.InfraSourceFields}
  ${sourceConfigurationFieldsFragment}
  ${sourceStatusFieldsFragment}
`;
