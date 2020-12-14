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
