/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './all';
export * from './details';
export * from './last_event_time';

export enum TimelineEventsQueries {
  all = 'eventsAll',
  details = 'eventsDetails',
  lastEventTime = 'eventsLastEventTime',
}
