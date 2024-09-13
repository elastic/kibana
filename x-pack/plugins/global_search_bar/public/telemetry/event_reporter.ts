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
  private reportEvent: AnalyticsServiceStart['reportEvent'];
  private trackUiMetric: TrackUiMetricFn;
  private focusStart = Infinity;

  constructor({
    analytics,
    usageCollection,
  }: {
    analytics: AnalyticsServiceStart;
    usageCollection: UsageCollectionSetup | undefined;
  }) {
    this.reportEvent = analytics.reportEvent;

    if (usageCollection) {
      this.trackUiMetric = (metricType, eventName, context) => {
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
    } else {
      this.trackUiMetric = () => {};
    }
  }

  /**
   * Called when the text input component has the cursor focused
   */
  public searchFocus() {
    this.trackUiMetric(METRIC_TYPE.COUNT, CountMetric.SEARCH_FOCUS);

    this.focusStart = Date.now();
  }

  /**
   * Called when the text input component has lost focus
   */
  public searchBlur() {
    const focusTime = Date.now() - this.focusStart;
    if (focusTime > 0) {
      this.reportEvent(EventMetric.SEARCH_BLUR, {
        [FieldType.FOCUS_TIME]: focusTime,
      });
    }

    // reset internal states
    this.focusStart = Infinity;
  }

  /**
   * Called on each keystroke as the user changes the search terms
   */
  public searchRequest() {
    this.trackUiMetric(METRIC_TYPE.COUNT, CountMetric.SEARCH_REQUEST);
  }

  /**
   * Called when the users uses the shortcut to make the search bar visible and focus the cursor
   */
  public shortcutUsed() {
    this.trackUiMetric(METRIC_TYPE.COUNT, CountMetric.SHORTCUT_USED);
  }

  /**
   * Called when the users selects an application in their search results
   */
  public navigateToApplication(context: TrackedApplicationClick) {
    const application = context?.application ?? 'unknown';

    this.trackUiMetric(METRIC_TYPE.CLICK, ClickMetric.USER_NAVIGATED_TO_APPLICATION, application);

    const terms = context?.searchValue ?? '';
    this.reportEvent(EventMetric.CLICK_APPLICATION, {
      [FieldType.TERMS]: terms,
      [FieldType.APPLICATION]: application,
      [FieldType.SELECTED_RANK]: context.selectedRank,
      [FieldType.SELECTED_LABEL]: context.selectedLabel,
    });
  }

  /**
   * Called when the users selects Saved Object in their search results
   */
  public navigateToSavedObject(context: TrackedSavedObjectClick) {
    const type = context?.type ?? 'unknown';

    this.trackUiMetric(METRIC_TYPE.CLICK, ClickMetric.USER_NAVIGATED_TO_SAVED_OBJECT, type);

    const terms = context?.searchValue ?? '';
    this.reportEvent(EventMetric.CLICK_SAVED_OBJECT, {
      [FieldType.TERMS]: terms,
      [FieldType.SAVED_OBJECT_TYPE]: type,
      [FieldType.SELECTED_RANK]: context.selectedRank,
      [FieldType.SELECTED_LABEL]: context.selectedLabel,
    });
  }

  /**
   * Called from error handlers
   */
  public error(context: TrackedError | undefined) {
    this.trackUiMetric(METRIC_TYPE.COUNT, CountMetric.UNHANDLED_ERROR);

    const message = context?.message.toString() ?? 'unknown';
    const terms = context?.searchValue ?? '';
    this.reportEvent(EventMetric.ERROR, {
      [FieldType.TERMS]: terms,
      [FieldType.ERROR_MESSAGE]: message,
    });
  }
}
