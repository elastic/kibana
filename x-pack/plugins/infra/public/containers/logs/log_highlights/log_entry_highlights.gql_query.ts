/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

import { sharedFragments } from '../../../../common/graphql/shared';

export const logEntryHighlightsQuery = gql`
  query LogEntryHighlightsQuery(
    $sourceId: ID = "default"
    $startKey: InfraTimeKeyInput!
    $endKey: InfraTimeKeyInput!
    $filterQuery: String
    $highlights: [InfraLogEntryHighlightInput!]!
  ) {
    source(id: $sourceId) {
      id
      logEntryHighlights(
        startKey: $startKey
        endKey: $endKey
        filterQuery: $filterQuery
        highlights: $highlights
      ) {
        start {
          ...InfraTimeKeyFields
        }
        end {
          ...InfraTimeKeyFields
        }
        entries {
          ...InfraLogEntryHighlightFields
        }
      }
    }
  }

  ${sharedFragments.InfraTimeKey}
  ${sharedFragments.InfraLogEntryHighlightFields}
`;
