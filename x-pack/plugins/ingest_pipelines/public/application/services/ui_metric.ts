/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';

import { UIM_APP_NAME } from '../constants';

export class UiMetricService {
  private usageCollection: UsageCollectionSetup | undefined;

  public setup(usageCollection: UsageCollectionSetup) {
    this.usageCollection = usageCollection;
  }

  private track(name: string) {
    if (!this.usageCollection) {
      // Usage collection is an optional plugin and might be disabled
      return;
    }

    const { reportUiCounter, METRIC_TYPE } = this.usageCollection;
    reportUiCounter(UIM_APP_NAME, METRIC_TYPE.COUNT, name);
  }

  public trackUiMetric(eventName: string) {
    return this.track(eventName);
  }
}

export const uiMetricService = new UiMetricService();
