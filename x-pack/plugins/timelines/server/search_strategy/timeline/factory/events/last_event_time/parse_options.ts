/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timelineEventsLastEventTimeRequestSchema } from '../../../../../../common/api/search_strategy/timeline/events_last_event_time';

export const parseOptions = (options: unknown) =>
  timelineEventsLastEventTimeRequestSchema.parse(options);
