/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceStart } from '@kbn/core/public';
import {
  EVENT_TYPE,
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
      this.analytics.reportEvent(EVENT_TYPE.SEARCH_BLUR, { focus_time_ms: focusTime });
      this.focusStart = Infinity;
    }
  }

  public navigateToApplication(context: TrackedApplicationClick) {
    const application = context?.application ?? 'unknown';
    const terms = context?.searchValue ?? null;
    const payload = { terms, application };
    this.analytics.reportEvent(EVENT_TYPE.CLICK_APPLICATION, payload);
  }

  public navigateToSavedObject(context: TrackedSavedObjectClick | undefined) {
    const type = context?.type ?? 'unknown';
    const terms = context?.searchValue ?? null;
    const payload = { terms, savedObjectType: type };
    this.analytics.reportEvent(EVENT_TYPE.CLICK_SAVED_OBJECT, payload);
  }

  public error(context: TrackedError | undefined) {
    const message = context?.message ?? 'unknown';
    const terms = context?.searchValue ?? null;
    const payload = { terms, message };
    this.analytics.reportEvent(EVENT_TYPE.ERROR, payload);
  }
}
