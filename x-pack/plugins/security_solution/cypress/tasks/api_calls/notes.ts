/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const addNoteToTimeline = (note: string, timelineId: string) =>
  cy.request({
    method: 'POST',
    url: '/api/solutions/security/graphql',
    body: {
      operationName: 'PersistTimelineNoteMutation',
      variables: {
        noteId: null,
        version: null,
        note: { note, timelineId },
      },
      query:
        'mutation PersistTimelineNoteMutation($noteId: ID, $version: String, $note: NoteInput!) {\n  persistNote(noteId: $noteId, version: $version, note: $note) {\n    code\n    message\n    note {\n      eventId\n      note\n      timelineId\n      timelineVersion\n      noteId\n      created\n      createdBy\n      updated\n      updatedBy\n      version\n      __typename\n    }\n    __typename\n  }\n}\n',
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });
