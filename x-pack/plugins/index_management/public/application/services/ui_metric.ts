/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UiCounterMetricType } from '@kbn/analytics';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';

let uiMetricService: UiMetricService;

export class UiMetricService {
  private appName: string;
  private usageCollection: UsageCollectionSetup | undefined;

  constructor(appName: string) {
    this.appName = appName;
  }

  public setup(usageCollection: UsageCollectionSetup) {
    this.usageCollection = usageCollection;
  }

  public trackMetric(type: UiCounterMetricType, eventName: string) {
    if (!this.usageCollection) {
      // Usage collection might have been disabled in Kibana config.
      return;
    }
    return this.usageCollection.reportUiCounter(this.appName, type, eventName);
  }
}

/**
 * To minimize the refactor to migrate to NP where all deps should be explicitely declared
 * we will export here the instance created in our plugin.ts setup() so other parts of the code can access it.
 *
 * TODO: Refactor the api.ts (convert it to a class with setup()) and detail_panel.ts (reducer) to explicitely declare their dependency on the UiMetricService
 * @param instance UiMetricService instance from our plugin.ts setup()
 */
export const setUiMetricServiceInstance = (instance: UiMetricService) => {
  uiMetricService = instance;
};

export const getUiMetricServiceInstance = () => {
  return uiMetricService;
};
