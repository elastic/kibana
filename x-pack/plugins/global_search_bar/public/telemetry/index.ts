/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceStart } from '@kbn/core/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { ClickMetric, TrackUiMetricFn } from '../types';
import { EventReporter } from './event_reporter';

interface ReporterOpts {
  analytics: AnalyticsServiceStart;
  usageCollection?: UsageCollectionStart;
}

export const getTrackUiMetric = ({ analytics, usageCollection }: ReporterOpts): TrackUiMetricFn => {
  const track: TrackUiMetricFn = (metricType, eventName, context) => {
    if (usageCollection) {
      let counter: [string, string | [string, string]];
      switch (eventName) {
        case ClickMetric.USER_NAVIGATED_TO_APPLICATION:
        case ClickMetric.USER_NAVIGATED_TO_SAVED_OBJECT:
          counter = [metricType, [eventName, `${eventName}_${context}`]];
          break;
        default:
          // track simple UI Counter metrics
          counter = [metricType, eventName];
      }
      usageCollection.reportUiCounter('global_search_bar', ...counter);
    }
  };

  const reportEvent = new EventReporter(analytics);
  // create references of the public methods of EventReporter
  track.searchFocus = reportEvent.searchFocus.bind(reportEvent);
  track.searchBlur = reportEvent.searchBlur.bind(reportEvent);
  track.navigateToApplication = reportEvent.navigateToApplication.bind(reportEvent);
  track.navigateToSavedObject = reportEvent.navigateToSavedObject.bind(reportEvent);
  track.error = reportEvent.error.bind(reportEvent);

  return track;
};

export { eventTypes } from './event_types';
export type { EventReporter };
