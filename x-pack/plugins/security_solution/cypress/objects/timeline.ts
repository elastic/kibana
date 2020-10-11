/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Timeline {
  title: string;
  description: string;
  query: string;
}

export interface CompleteTimeline extends Timeline {
  notes: string;
  filter: TimelineFilter;
}

export interface TimelineFilter {
  field: string;
  operator: string;
  value?: string;
}

export interface TimelineWithId extends Timeline {
  id: string;
}

export const filter: TimelineFilter = {
  field: 'host.name',
  operator: 'exists',
};

export const timeline: CompleteTimeline = {
  title: 'Security Timeline',
  description: 'This is the best timeline',
  query: 'host.name: * ',
  notes: 'Yes, the best timeline',
  filter,
};
