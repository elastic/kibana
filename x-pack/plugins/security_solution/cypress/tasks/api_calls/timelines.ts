/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineResponse } from '../../../common/types/timeline';
import { CompleteTimeline } from '../../objects/timeline';
import { rootRequest } from '../common';

export const createTimeline = (timeline: CompleteTimeline) =>
  rootRequest<TimelineResponse>({
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
        savedQueryId: null,
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });

export const createTimelineTemplate = (timeline: CompleteTimeline) =>
  rootRequest<TimelineResponse>({
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
        savedQueryId: null,
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds' },
  });

export const deleteTimeline = (timelineId: string) => {
  rootRequest({
    method: 'POST',
    url: 'api/timeline',
    body: {
      id: [timelineId],
    },
    headers: { 'kbn-xsrf': 'delete-signals' },
  });
};

export const getTimelineById = (timelineId: string) =>
  rootRequest({
    method: 'GET',
    url: `api/timeline?id=${timelineId}`,
    headers: { 'kbn-xsrf': 'timeline-by-id' },
  });

export const loadPrepackagedTimelineTemplates = () =>
  rootRequest({
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
  rootRequest({
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
