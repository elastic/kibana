/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UiCounterMetricType } from '@kbn/analytics';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';

export const UIM_APP_NAME = 'upgrade_assistant';
export const UIM_ES_DEPRECATIONS_PAGE_LOAD = 'es_deprecations_page_load';
export const UIM_KIBANA_DEPRECATIONS_PAGE_LOAD = 'kibana_deprecations_page_load';
export const UIM_OVERVIEW_PAGE_LOAD = 'overview_page_load';
export const UIM_REINDEX_OPEN_FLYOUT_CLICK = 'reindex_open_flyout_click';
export const UIM_REINDEX_CLOSE_FLYOUT_CLICK = 'reindex_close_flyout_click';
export const UIM_REINDEX_START_CLICK = 'reindex_start_click';
export const UIM_REINDEX_STOP_CLICK = 'reindex_stop_click';

export class UiMetricService {
  private usageCollection: UsageCollectionSetup | undefined;

  public setup(usageCollection: UsageCollectionSetup) {
    this.usageCollection = usageCollection;
  }

  private track(metricType: UiCounterMetricType, eventName: string | string[]) {
    if (!this.usageCollection) {
      // Usage collection might have been disabled in Kibana config.
      return;
    }
    return this.usageCollection.reportUiCounter.bind(
      this.usageCollection,
      UIM_APP_NAME,
      metricType,
      eventName
    );
  }

  public trackUiMetric(metricType: UiCounterMetricType, eventName: string | string[]) {
    return this.track(metricType, eventName);
  }
}

export const uiMetricService = new UiMetricService();
