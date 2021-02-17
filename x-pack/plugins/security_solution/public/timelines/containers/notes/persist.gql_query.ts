/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import gql from 'graphql-tag';

export const persistTimelineNoteMutation = gql`
  mutation PersistTimelineNoteMutation($noteId: ID, $version: String, $note: NoteInput!) {
    persistNote(noteId: $noteId, version: $version, note: $note) {
      code
      message
      note {
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
    }
  }
`;
