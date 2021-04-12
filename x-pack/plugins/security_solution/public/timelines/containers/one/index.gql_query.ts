/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import gql from 'graphql-tag';

export const oneTimelineQuery = gql`
  query GetOneTimeline($id: ID!, $timelineType: TimelineType) {
    getOneTimeline(id: $id, timelineType: $timelineType) {
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
        type
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
          type
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
      eqlOptions {
        eventCategoryField
        tiebreakerField
        timestampField
        query
        size
      }
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
      excludedRowRendererIds
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
      indexNames
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
      sort
      created
      createdBy
      updated
      updatedBy
      version
    }
  }
`;
