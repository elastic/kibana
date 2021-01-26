/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CompleteTimeline } from '../../objects/timeline';

export const createTimeline = (timeline: CompleteTimeline) =>
  cy.request({
    method: 'POST',
    url: 'api/timeline',
    body: {
      timeline: {
        columns: [
          {
            id: '@timestamp',
          },
          {
            id: 'user.name',
          },
          {
            id: 'event.category',
          },
          {
            id: 'event.action',
          },
          {
            id: 'host.name',
          },
        ],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: {
            kuery: {
              expression: timeline.query,
              kind: 'kuery',
            },
          },
        },
        dateRange: {
          end: '1577881376000',
          start: '1514809376000',
        },
        description: timeline.description,
        title: timeline.title,
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });

export const createTimelineTemplate = (timeline: CompleteTimeline) =>
  cy.request({
    method: 'POST',
    url: 'api/timeline',
    body: {
      timeline: {
        columns: [
          {
            id: '@timestamp',
          },
          {
            id: 'user.name',
          },
          {
            id: 'event.category',
          },
          {
            id: 'event.action',
          },
          {
            id: 'host.name',
          },
        ],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: {
            kuery: {
              expression: timeline.query,
              kind: 'kuery',
            },
          },
        },
        dateRange: {
          end: '1577881376000',
          start: '1514809376000',
        },
        description: timeline.description,
        title: timeline.title,
        templateTimelineVersion: 1,
        timelineType: 'template',
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });

export const deleteTimeline = (timelineId: string) => {
  cy.request({
    method: 'POST',
    url: 'api/solutions/security/graphql',
    body: {
      operationName: 'DeleteTimelineMutation',
      variables: {
        id: [timelineId],
      },
      query: 'mutation DeleteTimelineMutation($id: [ID!]!) {\n  deleteTimeline(id: $id)\n}\n',
    },
    headers: { 'kbn-xsrf': 'delete-signals' },
  });
};

export const getTimelineById = (timelineId: string) =>
  cy.request({
    method: 'POST',
    url: 'api/solutions/security/graphql',
    body: {
      operationName: 'GetOneTimeline',
      variables: {
        id: timelineId,
      },
      query:
        'query GetOneTimeline($id: ID!, $timelineType: TimelineType) {\n  getOneTimeline(id: $id, timelineType: $timelineType) {\n    savedObjectId\n    columns {\n      aggregatable\n      category\n      columnHeaderType\n      description\n      example\n      indexes\n      id\n      name\n      searchable\n      type\n      __typename\n    }\n    dataProviders {\n      id\n      name\n      enabled\n      excluded\n      kqlQuery\n      type\n      queryMatch {\n        field\n        displayField\n        value\n        displayValue\n        operator\n        __typename\n      }\n      and {\n        id\n        name\n        enabled\n        excluded\n        kqlQuery\n        type\n        queryMatch {\n          field\n          displayField\n          value\n          displayValue\n          operator\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    dateRange {\n      start\n      end\n      __typename\n    }\n    description\n    eventType\n    eventIdToNoteIds {\n      eventId\n      note\n      timelineId\n      noteId\n      created\n      createdBy\n      timelineVersion\n      updated\n      updatedBy\n      version\n      __typename\n    }\n    excludedRowRendererIds\n    favorite {\n      fullName\n      userName\n      favoriteDate\n      __typename\n    }\n    filters {\n      meta {\n        alias\n        controlledBy\n        disabled\n        field\n        formattedValue\n        index\n        key\n        negate\n        params\n        type\n        value\n        __typename\n      }\n      query\n      exists\n      match_all\n      missing\n      range\n      script\n      __typename\n    }\n    kqlMode\n    kqlQuery {\n      filterQuery {\n        kuery {\n          kind\n          expression\n          __typename\n        }\n        serializedQuery\n        __typename\n      }\n      __typename\n    }\n    indexNames\n    notes {\n      eventId\n      note\n      timelineId\n      timelineVersion\n      noteId\n      created\n      createdBy\n      updated\n      updatedBy\n      version\n      __typename\n    }\n    noteIds\n    pinnedEventIds\n    pinnedEventsSaveObject {\n      pinnedEventId\n      eventId\n      timelineId\n      created\n      createdBy\n      updated\n      updatedBy\n      version\n      __typename\n    }\n    status\n    title\n    timelineType\n    templateTimelineId\n    templateTimelineVersion\n    savedQueryId\n    sort\n    created\n    createdBy\n    updated\n    updatedBy\n    version\n    __typename\n  }\n}\n',
    },
    headers: { 'kbn-xsrf': 'timeline-by-id' },
  });
