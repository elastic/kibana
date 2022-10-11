/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompleteTimeline } from '../../objects/timeline';

const timelineBody = (timeline: CompleteTimeline) => {
  return {
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
      end: '2022-04-01T12:22:56.000Z',
      start: '2018-01-01T12:22:56.000Z',
    },
    description: timeline.description,
    title: timeline.title,
    savedQueryId: null,
    ...(timeline.dataViewId != null && timeline.indexNames != null
      ? { dataViewId: timeline.dataViewId, indexNames: timeline.indexNames }
      : {}),
  };
};

export const createTimeline = (timeline: CompleteTimeline) =>
  cy.request({
    method: 'POST',
    url: 'api/timeline',
    body: {
      timeline: {
        ...timelineBody(timeline),
        timelineType: 'default',
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
        ...timelineBody(timeline),
        timelineType: 'template',
        templateTimelineVersion: 1,
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });

export const loadPrepackagedTimelineTemplates = () =>
  cy.request({
    method: 'POST',
    url: 'api/timeline/_prepackaged',
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });

export const favoriteTimeline = ({
  timelineId,
  timelineType,
  templateTimelineId,
  templateTimelineVersion,
}: {
  timelineId: string;
  timelineType: string;
  templateTimelineId?: string;
  templateTimelineVersion?: number;
}) =>
  cy.request({
    method: 'PATCH',
    url: 'api/timeline/_favorite',
    body: {
      timelineId,
      timelineType,
      templateTimelineId: templateTimelineId || null,
      templateTimelineVersion: templateTimelineVersion || null,
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });
