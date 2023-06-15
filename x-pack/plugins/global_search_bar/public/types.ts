/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UiCounterMetricType } from '@kbn/analytics';
export { METRIC_TYPE } from '@kbn/analytics';

/* @internal */
export enum COUNT_METRIC {
  UNHANDLED_ERROR = 'unhandled_error',
  SHORTCUT_USED = 'shortcut_used',
  SEARCH_BLUR = 'search_blur',
  SEARCH_FOCUS = 'search_focus',
  SEARCH_REQUEST = 'search_request',
}

/* @internal */
export enum CLICK_METRIC {
  USER_NAVIGATED_TO_APPLICATION = 'user_navigated_to_application',
  USER_NAVIGATED_TO_SAVED_OBJECT = 'user_navigated_to_saved_object',
}

export interface TrackedApplicationClick {
  application: string;
}
export interface TrackedSavedObjectClick {
  type: string;
}
export interface TrackedError {
  message: string | Error;
}

export type TrackingContext = (TrackedApplicationClick | TrackedSavedObjectClick | TrackedError) & {
  searchValue?: string;
};

type EventType = COUNT_METRIC | CLICK_METRIC;

/* @internal */
export type TrackUiMetricFn = (
  metricType: UiCounterMetricType,
  eventName: EventType,
  context?: TrackingContext
) => void;
