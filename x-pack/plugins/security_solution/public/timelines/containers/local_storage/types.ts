/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineModel } from '../../../timelines/store/timeline/model';

export type HOST_PAGE_EVENTS_TIMELINE_ID = 'hosts-page-events';
export type HOST_PAGE_EXTERNAL_EVENTS_TIMELINE_ID = 'hosts-page-external-alerts';
export type ALERTS_PAGE_SINGLE_RULE_TIMELINE_ID = 'alerts-rules-details-page';
export type ALERTS_PAGE_TIMELINE_ID = 'alerts-page';
export type NETWORK_PAGE_EXTERNAL_EVENTS_TIMELINE_ID = 'network-page-external-alerts';

export type TimelineId =
  | HOST_PAGE_EVENTS_TIMELINE_ID
  | HOST_PAGE_EXTERNAL_EVENTS_TIMELINE_ID
  | ALERTS_PAGE_SINGLE_RULE_TIMELINE_ID
  | ALERTS_PAGE_TIMELINE_ID
  | NETWORK_PAGE_EXTERNAL_EVENTS_TIMELINE_ID;
export interface TimelinesStorage {
  getAllTimelines: () => Record<TimelineId, TimelineModel>;
  getTimelineById: (id: TimelineId) => TimelineModel | null;
  addTimeline: (id: TimelineId, timeline: TimelineModel) => void;
}
