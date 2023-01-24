/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { METRIC_TYPE } from '@kbn/analytics';

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';

export class UiMetricService {
  private usageCollection: UsageCollectionSetup | undefined;

  constructor(private appName: string) {}

  public setup(usageCollection: UsageCollectionSetup) {
    this.usageCollection = usageCollection;
  }

  private track(name: string) {
    if (!this.usageCollection) {
      // Usage collection might have been disabled in Kibana config.
      return;
    }
    this.usageCollection.reportUiCounter(this.appName, METRIC_TYPE.COUNT, name);
  }

  public trackUiMetric(eventName: string) {
    return this.track(eventName);
  }
}
