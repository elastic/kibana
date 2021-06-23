/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineFactoryQueryTypes } from '../../../../common/search_strategy/timeline';
import { TimelineFactory } from './types';
import { timelineEventsFactory } from './events';

export const timelineFactory: Record<
  TimelineFactoryQueryTypes,
  TimelineFactory<TimelineFactoryQueryTypes>
> = {
  ...timelineEventsFactory,
};
