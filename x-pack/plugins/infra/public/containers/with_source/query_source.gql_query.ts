/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

import { sourceFieldsFragment } from './source_fields_fragment.gql_query';

export const sourceQuery = gql`
  query SourceQuery($sourceId: ID = "default") {
    source(id: $sourceId) {
      ...SourceFields
    }
  }

  ${sourceFieldsFragment}
`;
