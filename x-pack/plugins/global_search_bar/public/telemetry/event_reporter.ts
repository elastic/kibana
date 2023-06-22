/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceStart } from '@kbn/core/public';
import {
  EventMetric,
  FieldType,
  TrackedApplicationClick,
  TrackedError,
  TrackedSavedObjectClick,
} from '../types';

export class EventReporter {
  private focusStart = Infinity;

  constructor(private analytics: AnalyticsServiceStart) {}

  public searchFocus() {
    this.focusStart = new Date(Date.now()).valueOf();
  }

  public searchBlur() {
    const focusTime = new Date(Date.now()).valueOf() - this.focusStart;

    if (focusTime > 0) {
      this.analytics.reportEvent(EventMetric.SEARCH_BLUR, { focus_time_ms: focusTime });
      this.focusStart = Infinity;
    }
  }

  public navigateToApplication(context: TrackedApplicationClick) {
    const application = context?.application ?? 'unknown';
    const terms = context?.searchValue ?? null;
    const payload: Record<FieldType.TERMS | FieldType.APPLICATION, string | null> = {
      terms,
      application,
    };
    this.analytics.reportEvent(EventMetric.CLICK_APPLICATION, payload);
  }

  public navigateToSavedObject(context: TrackedSavedObjectClick | undefined) {
    const type = context?.type ?? 'unknown';
    const terms = context?.searchValue ?? null;
    const payload: Record<FieldType.TERMS | FieldType.SAVED_OBJECT_TYPE, string | null> = {
      terms,
      saved_object_type: type,
    };
    this.analytics.reportEvent(EventMetric.CLICK_SAVED_OBJECT, payload);
  }

  public error(context: TrackedError | undefined) {
    const message = context?.message.toString() ?? 'unknown';
    const terms = context?.searchValue ?? null;
    const payload: Record<FieldType.TERMS | FieldType.ERROR_MESSAGE, string | null> = {
      terms,
      error_message: message,
    };
    this.analytics.reportEvent(EventMetric.ERROR, payload);
  }
}
