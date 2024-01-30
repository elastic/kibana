/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/analytics-client';
import type { TelemetryEventTypes } from '../../constants';

export interface TimelineFullScreenClickedParams {
  timelineId: string;
  tab: string;
}

export type TimelineTelemetryEventParams = TimelineFullScreenClickedParams;

export interface TimelineTelemetryEvent {
  eventType: TelemetryEventTypes.TimelineFullScreenClicked;
  schema: RootSchema<TimelineFullScreenClickedParams>;
}
