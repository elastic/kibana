/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const oneTimelineQuery = gql`
  query GetOneTimeline($id: ID!) {
    getOneTimeline(id: $id) {
      savedObjectId
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
      dateRange {
        start
        end
      }
      description
      eventType
      eventIdToNoteIds {
        eventId
        note
        timelineId
        noteId
        created
        createdBy
        timelineVersion
        updated
        updatedBy
        version
      }
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
      notes {
        eventId
        note
        timelineId
        timelineVersion
        noteId
        created
        createdBy
        updated
        updatedBy
        version
      }
      noteIds
      pinnedEventIds
      pinnedEventsSaveObject {
        pinnedEventId
        eventId
        timelineId
        created
        createdBy
        updated
        updatedBy
        version
      }
      status
      title
      timelineType
      templateTimelineId
      templateTimelineVersion
      savedQueryId
      sort {
        columnId
        sortDirection
      }
      created
      createdBy
      updated
      updatedBy
      version
    }
  }
`;
