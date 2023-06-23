/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { METRIC_TYPE } from '@kbn/analytics';
import { AnalyticsServiceStart } from '@kbn/core/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import {
  ClickMetric,
  CountMetric,
  EventMetric,
  FieldType,
  TrackedApplicationClick,
  TrackedError,
  TrackedSavedObjectClick,
  TrackUiMetricFn,
} from '../types';

export class EventReporter {
  private deps: {
    analytics: AnalyticsServiceStart;
  };
  private trackUiMetric: TrackUiMetricFn;
  private focusStart = Infinity;

  constructor({
    analytics,
    usageCollection,
  }: {
    analytics: AnalyticsServiceStart;
    usageCollection: UsageCollectionSetup | undefined;
  }) {
    this.deps = { analytics };

    let trackUiMetric: TrackUiMetricFn = () => {};
    if (usageCollection) {
      trackUiMetric = (metricType, eventName, context) => {
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
      };
    }

    this.trackUiMetric = trackUiMetric;
  }

  public searchFocus() {
    this.trackUiMetric(METRIC_TYPE.COUNT, CountMetric.SEARCH_FOCUS);

    this.focusStart = new Date(Date.now()).valueOf();
  }

  public searchBlur() {
    const focusTime = new Date(Date.now()).valueOf() - this.focusStart;

    if (focusTime > 0) {
      this.deps.analytics.reportEvent(EventMetric.SEARCH_BLUR, { focus_time_ms: focusTime });
      this.focusStart = Infinity;
    }
  }

  public searchRequest() {
    this.trackUiMetric(METRIC_TYPE.COUNT, CountMetric.SEARCH_REQUEST);
  }

  public searchBarClose() {
    // TODO
  }

  public searchBarOpen() {
    // TODO
  }

  public shortcutUsed() {
    this.trackUiMetric(METRIC_TYPE.COUNT, CountMetric.SHORTCUT_USED);
    this.searchBarOpen();
  }

  public navigateToApplication(context: TrackedApplicationClick) {
    const application = context?.application ?? 'unknown';

    this.trackUiMetric(METRIC_TYPE.CLICK, ClickMetric.USER_NAVIGATED_TO_APPLICATION, application);

    const terms = context?.searchValue ?? null;
    const payload: Record<FieldType.TERMS | FieldType.APPLICATION, string | null> = {
      terms,
      application,
    };
    this.deps.analytics.reportEvent(EventMetric.CLICK_APPLICATION, payload);
  }

  public navigateToSavedObject(context: TrackedSavedObjectClick | undefined) {
    const type = context?.type ?? 'unknown';

    this.trackUiMetric(METRIC_TYPE.CLICK, ClickMetric.USER_NAVIGATED_TO_SAVED_OBJECT, type);

    const terms = context?.searchValue ?? null;
    const payload: Record<FieldType.TERMS | FieldType.SAVED_OBJECT_TYPE, string | null> = {
      terms,
      saved_object_type: type,
    };
    this.deps.analytics.reportEvent(EventMetric.CLICK_SAVED_OBJECT, payload);
  }

  public error(context: TrackedError | undefined) {
    this.trackUiMetric(METRIC_TYPE.COUNT, CountMetric.UNHANDLED_ERROR);

    const message = context?.message.toString() ?? 'unknown';
    const terms = context?.searchValue ?? null;
    const payload: Record<FieldType.TERMS | FieldType.ERROR_MESSAGE, string | null> = {
      terms,
      error_message: message,
    };
    this.deps.analytics.reportEvent(EventMetric.ERROR, payload);
  }
}
