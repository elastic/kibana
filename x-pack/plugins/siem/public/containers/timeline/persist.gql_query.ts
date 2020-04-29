/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const persistTimelineMutation = gql`
  mutation PersistTimelineMutation($timelineId: ID, $version: String, $timeline: TimelineInput!) {
    persistTimeline(id: $timelineId, version: $version, timeline: $timeline) {
      code
      message
      timeline {
        savedObjectId
        version
        columns {
          aggregatable
          category
          columnHeaderType
          description
          example
          indexes
          id
          name
          searchable
          type
        }
        dataProviders {
          id
          name
          enabled
          excluded
          kqlQuery
          queryMatch {
            field
            displayField
            value
            displayValue
            operator
          }
          and {
            id
            name
            enabled
            excluded
            kqlQuery
            queryMatch {
              field
              displayField
              value
              displayValue
              operator
            }
          }
        }
        description
        eventType
        favorite {
          fullName
          userName
          favoriteDate
        }
        filters {
          meta {
            alias
            controlledBy
            disabled
            field
            formattedValue
            index
            key
            negate
            params
            type
            value
          }
          query
          exists
          match_all
          missing
          range
          script
        }
        kqlMode
        kqlQuery {
          filterQuery {
            kuery {
              kind
              expression
            }
            serializedQuery
          }
        }
        title
        dateRange {
          start
          end
        }
        savedQueryId
        sort {
          columnId
          sortDirection
        }
        created
        createdBy
        updated
        updatedBy
      }
    }
  }
`;
