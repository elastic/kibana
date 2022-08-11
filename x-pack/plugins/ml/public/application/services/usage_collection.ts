/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { PLUGIN_ID } from '../../../common/constants/app';
import { MlUsageEvent } from '../../../common/constants/usage_collection';

export function mlUsageCollectionProvider(usageCollection?: UsageCollectionSetup) {
  if (usageCollection === undefined) {
    // if usageCollection is disabled, swallow the clicks and counts
    const noop = (eventNames: string | string[], count?: number) => undefined;
    return {
      click: noop,
      count: noop,
    };
  }

  return {
    click: (eventNames: MlUsageEvent | MlUsageEvent[], count?: number) =>
      usageCollection.reportUiCounter(PLUGIN_ID, METRIC_TYPE.CLICK, eventNames, count),
    count: (eventNames: MlUsageEvent | MlUsageEvent[], count?: number) =>
      usageCollection.reportUiCounter(PLUGIN_ID, METRIC_TYPE.COUNT, eventNames, count),
  };
}
