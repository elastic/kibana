/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceStart } from '@kbn/core/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import {
  CLICK_METRIC,
  COUNT_METRIC,
  TrackedApplicationClick,
  TrackedError,
  TrackedSavedObjectClick,
  TrackingContext,
  TrackUiMetricFn,
} from '../types';

interface Opts {
  analytics: AnalyticsServiceStart;
  usageCollection?: UsageCollectionStart;
}

export const getTracking = ({ analytics, usageCollection }: Opts): TrackUiMetricFn => {
  const tracker = new UiMetricTracker(analytics);
  return (metricType, eventName, context) => {
    if (usageCollection) {
      let counter: [string, string | [string, string]];
      switch (eventName) {
        case CLICK_METRIC.USER_NAVIGATED_TO_APPLICATION:
          counter = [
            metricType,
            [eventName, `${eventName}_${(context as TrackedApplicationClick).application}`],
          ];
          break;
        case CLICK_METRIC.USER_NAVIGATED_TO_SAVED_OBJECT:
          counter = [
            metricType,
            [eventName, `${eventName}_${(context as TrackedSavedObjectClick).type}`],
          ];
          break;
        default:
          // track simple UI Counter metrics
          counter = [metricType, eventName];
      }
      usageCollection.reportUiCounter('global_search_bar', ...counter);
    }

    // track EBT
    switch (eventName) {
      case COUNT_METRIC.SEARCH_FOCUS:
        tracker.searchFocus();
        break;
      case COUNT_METRIC.SEARCH_BLUR:
        tracker.searchBlur();
        break;
      case COUNT_METRIC.UNHANDLED_ERROR:
        tracker.error(context);
        break;
      case CLICK_METRIC.USER_NAVIGATED_TO_APPLICATION:
        tracker.navigateToApplication(context);
        break;
      case CLICK_METRIC.USER_NAVIGATED_TO_SAVED_OBJECT:
        tracker.navigateToSavedObject(context);
        break;
    }
  };
};

class UiMetricTracker {
  private focusStart = Infinity;

  constructor(private analytics: AnalyticsServiceStart) {}

  public searchFocus() {
    this.focusStart = new Date(Date.now()).valueOf();
  }

  public searchBlur() {
    const focusTime = new Date(Date.now()).valueOf() - this.focusStart;

    if (focusTime > 0) {
      const payload: [string, object] = ['global_search_bar_blur', { focus_time_ms: focusTime }];
      this.analytics.reportEvent(...payload);
      this.focusStart = Infinity;
    }
  }

  public navigateToApplication(context: TrackingContext | undefined) {
    let application: string | undefined;
    const temp = context as TrackedApplicationClick | undefined;
    if (temp?.application) {
      application = temp.application;
    }

    const payload: [string, object] = [
      'global_search_bar_click_application',
      { application, terms: context?.searchValue },
    ];
    this.analytics.reportEvent(...payload);
  }

  public navigateToSavedObject(context: TrackingContext | undefined) {
    let savedObjectType: string | undefined;
    const temp = context as TrackedSavedObjectClick | undefined;
    if (temp?.type) {
      savedObjectType = temp.type;
    }

    const payload: [string, object] = [
      'global_search_bar_click_savedobject',
      { type: savedObjectType, terms: context?.searchValue },
    ];
    this.analytics.reportEvent(...payload);
  }

  public error(context: TrackingContext | undefined) {
    let message: string | Error | undefined;
    const temp = context as TrackedError | undefined;
    if (temp?.message) {
      message = (context as TrackedError).message;
    }

    const payload: [string, object] = ['global_search_bar_error', { message }];
    this.analytics.reportEvent(...payload);
  }
}
