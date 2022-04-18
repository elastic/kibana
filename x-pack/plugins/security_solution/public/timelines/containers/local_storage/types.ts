/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineModel } from '../../store/timeline/model';
import { TimelineIdLiteral } from '../../../../common/types/timeline';

export interface TimelinesStorage {
  getAllTimelines: () => Record<TimelineIdLiteral, TimelineModel>;
  getTimelineById: (id: TimelineIdLiteral) => TimelineModel | null;
  addTimeline: (id: TimelineIdLiteral, timeline: TimelineModel) => void;
}
