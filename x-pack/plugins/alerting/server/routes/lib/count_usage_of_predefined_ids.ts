/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCounter } from 'src/plugins/usage_collection/server';

export interface CountUsageOfPredefinedIdsOptions {
  predefinedId?: string;
  spaceId?: string;
  usageCounter?: UsageCounter;
}

export function countUsageOfPredefinedIds({
  predefinedId,
  spaceId,
  usageCounter,
}: CountUsageOfPredefinedIdsOptions) {
  if (predefinedId) {
    if (usageCounter) {
      const usageCounterName =
        spaceId === undefined || spaceId === 'default'
          ? 'ruleCreatedWithPredefinedIdInDefaultSpace'
          : 'ruleCreatedWithPredefinedIdInCustomSpace';
      usageCounter?.incrementCounter({
        counterName: usageCounterName,
        incrementBy: 1,
      });
    }
  }
}
