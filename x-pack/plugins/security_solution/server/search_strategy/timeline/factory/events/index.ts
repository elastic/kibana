/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TimelineFactoryQueryTypes,
  TimelineEventsQueries,
} from '../../../../../common/search_strategy/timeline';

import { SecuritySolutionTimelineFactory } from '../types';
import { timelineEventsAll } from './all';
import { timelineEventsDetails } from './details';
import { timelineEventsLastEventTime } from './last_event_time';

export const timelineEventsFactory: Record<
  TimelineEventsQueries,
  SecuritySolutionTimelineFactory<TimelineFactoryQueryTypes>
> = {
  [TimelineEventsQueries.all]: timelineEventsAll,
  [TimelineEventsQueries.details]: timelineEventsDetails,
  [TimelineEventsQueries.lastEventTime]: timelineEventsLastEventTime,
};
