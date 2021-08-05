/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { PLUGIN_ID } from '../../../common/constants/app';

export function mlUsageCollectionProvider(usageCollection?: UsageCollectionSetup) {
  if (usageCollection === undefined) {
    // if usageCollection is disabled, swallow the clicks and counts
    const reportUiCounter = (eventNames: string | string[], count?: number) => undefined;
    return {
      click: reportUiCounter,
      count: reportUiCounter,
    };
  }

  return {
    click: (eventNames: string | string[], count?: number) =>
      usageCollection.reportUiCounter(PLUGIN_ID, METRIC_TYPE.CLICK, eventNames, count),
    count: (eventNames: string | string[], count?: number) =>
      usageCollection.reportUiCounter(PLUGIN_ID, METRIC_TYPE.COUNT, eventNames, count),
  };
}
