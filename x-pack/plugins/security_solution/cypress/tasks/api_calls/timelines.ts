/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CompleteTimeline, IndicatorMatchtimelineTemplate } from '../../objects/timeline';

export const createIndicatorMatchTimelineTemplate = (timeline: IndicatorMatchtimelineTemplate) =>
  cy.request({
    method: 'POST',
    url: 'api/timeline',
    body: {
      timeline: {
        columns: [
          { columnHeaderType: 'not-filtered', id: 'threat.indicator.matched.type' },
          { columnHeaderType: 'not-filtered', id: 'threat.indicator.matched.field' },
          { columnHeaderType: 'not-filtered', id: 'threat.indicator.matched.atomic' },
        ],
        dataProviders: [
          {
            id: 'timeline-1-f424e4f9-fbe7-4bc7-b3d7-348e532194c0',
            name: '{threat.indicator.matched.atomic}',
            enabled: true,
            excluded: false,
            kqlQuery: '',
            type: 'template',
            queryMatch: {
              field: 'threat.indicator.matched.atomic',
              value: '{threat.indicator.matched.atomic}',
              operator: ':',
            },
            and: [
              {
                id: 'timeline-1-23ff0cbf-c1b4-4c45-a525-4ea394e22fe3',
                name: '{threat.indicator.matched.field}',
                enabled: true,
                excluded: false,
                kqlQuery: '',
                type: 'template',
                queryMatch: {
                  field: 'threat.indicator.matched.field',
                  value: '{threat.indicator.matched.field}',
                  operator: ':',
                },
              },
              {
                id: 'timeline-1-9ff7c3ee-2db8-49b7-a166-392bdeaa5330',
                name: '{threat.indicator.matched.type}',
                enabled: true,
                excluded: false,
                kqlQuery: '',
                type: 'template',
                queryMatch: {
                  field: 'threat.indicator.matched.type',
                  value: '{threat.indicator.matched.type}',
                  operator: ':',
                },
              },
            ],
          },
        ],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: {
            kuery: {
              expression: '*:*',
              kind: 'kuery',
            },
          },
        },
        dateRange: {
          start: '2021-03-21T23:00:00.000Z',
          end: '2027-03-21T23:00:00.000Z',
        },
        description: timeline.description,
        title: timeline.title,
        templateTimelineVersion: 1,
        timelineType: 'template',
        templateTimelineId: timeline.templateTimelineId,
        savedQueryId: null,
        status: 'active',
      },
      timelineId: null,
      version: null,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });

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
    url: 'api/timeline',
    body: {
      id: [timelineId],
    },
    headers: { 'kbn-xsrf': 'delete-signals' },
  });
};

export const getTimelineById = (timelineId: string) =>
  cy.request({
    method: 'GET',
    url: `api/timeline?id=${timelineId}`,
    headers: { 'kbn-xsrf': 'timeline-by-id' },
  });
