/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TimelineFactoryQueryTypes,
  TimelineQueries,
} from '../../../../common/search_strategy/timeline';

import { timelineDetails } from './details';
import { SecuritySolutionTimelineFactory } from './types';

export const securitySolutionTimelineFactory: Record<
  TimelineFactoryQueryTypes,
  SecuritySolutionTimelineFactory<TimelineFactoryQueryTypes>
> = {
  [TimelineQueries.details]: timelineDetails,
};
