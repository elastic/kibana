/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockSelectedTimeline = [
  {
    savedObjectId: 'baa20980-6301-11ea-9223-95b6d4dd806c',
    version: 'WzExNzAsMV0=',
    columns: [
      {
        columnHeaderType: 'not-filtered',
        indexes: null,
        id: '@timestamp',
        name: null,
        searchable: null,
      },
      {
        columnHeaderType: 'not-filtered',
        indexes: null,
        id: 'message',
        name: null,
        searchable: null,
      },
      {
        columnHeaderType: 'not-filtered',
        indexes: null,
        id: 'event.category',
        name: null,
        searchable: null,
      },
      {
        columnHeaderType: 'not-filtered',
        indexes: null,
        id: 'event.action',
        name: null,
        searchable: null,
      },
      {
        columnHeaderType: 'not-filtered',
        indexes: null,
        id: 'host.name',
        name: null,
        searchable: null,
      },
      {
        columnHeaderType: 'not-filtered',
        indexes: null,
        id: 'source.ip',
        name: null,
        searchable: null,
      },
      {
        columnHeaderType: 'not-filtered',
        indexes: null,
        id: 'destination.ip',
        name: null,
        searchable: null,
      },
      {
        columnHeaderType: 'not-filtered',
        indexes: null,
        id: 'user.name',
        name: null,
        searchable: null,
      },
    ],
    dataProviders: [],
    description: 'with a global note',
    eventType: 'raw',
    filters: [],
    kqlMode: 'filter',
    kqlQuery: {
      filterQuery: {
        kuery: { kind: 'kuery', expression: 'zeek.files.sha1 : * ' },
        serializedQuery:
          '{"bool":{"should":[{"exists":{"field":"zeek.files.sha1"}}],"minimum_should_match":1}}',
      },
    },
    title: 'duplicate timeline',
    dateRange: { start: '2020-02-24T10:09:11.145Z', end: '2020-02-25T10:09:11.145Z' },
    savedQueryId: null,
    sort: { columnId: '@timestamp', sortDirection: 'desc' },
    created: 1583866966262,
    createdBy: 'elastic',
    updated: 1583866966262,
    updatedBy: 'elastic',
    notes: [
      {
        noteId: 'noteIdOne',
      },
      {
        noteId: 'noteIdTwo',
      },
    ],
    pinnedEventIds: { '23D_e3ABGy2SlgJPuyEh': true, eHD_e3ABGy2SlgJPsh4u: true },
  },
];
