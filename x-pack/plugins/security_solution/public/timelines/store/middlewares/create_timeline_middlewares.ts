/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';

import { timelineChangedMiddleware } from './changed';
import { favoriteTimelineMiddleware } from './favorite_timeline';
import { addNoteToTimelineMiddleware } from './timeline_note';
import { addPinnedEventToTimelineMiddleware } from './timeline_pinned_event';

export function createTimelineMiddlewares(kibana: CoreStart) {
  return [
    timelineChangedMiddleware,
    favoriteTimelineMiddleware(kibana),
    addNoteToTimelineMiddleware(kibana),
    addPinnedEventToTimelineMiddleware(kibana),
  ];
}
