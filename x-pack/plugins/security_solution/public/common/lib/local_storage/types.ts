/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineModel } from '../../../timelines/store/timeline/model';

type TimelineId = string;
export interface SecuritySolutionStorage {
  getAllTimelines: () => Record<TimelineId, TimelineModel>;
  addTimeline: (id: string, timeline: TimelineModel) => void;
}
