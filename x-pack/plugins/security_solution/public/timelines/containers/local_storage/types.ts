/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineModel } from '../../../timelines/store/timeline/model';

export type TimelineId = 'hosts-page-events' | 'hosts-page-external-alerts';
export interface TimelinesStorage {
  getAllTimelines: () => Record<TimelineId, TimelineModel> | null;
  getTimelineById: (id: TimelineId) => TimelineModel | null;
  addTimeline: (id: TimelineId, timeline: TimelineModel) => void;
}
