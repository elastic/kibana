/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';

export const [getUsageCollectionStart, setUsageCollectionStart] =
  createGetterSetter<UsageCollectionStart>('UsageCollection', false);

export const trackUiCounterEvents = (events: string | string[]) => {
  const usageCollection = getUsageCollectionStart();
  const originatingApp = 'lens';

  usageCollection?.reportUiCounter(
    originatingApp,
    METRIC_TYPE.COUNT,
    (Array.isArray(events) ? events : [events]).map((item) => `render_${originatingApp}_${item}`)
  );
};

export const getExecutionContextEvents = (context?: KibanaExecutionContext) => {
  const events = [];

  if (context) {
    events.push(
      [
        'vis',
        context.type,
        context.meta?.viewMode,
        context.meta?.fullScreenMode ? 'fullscreen' : undefined,
      ]
        .filter(Boolean)
        .join('_')
    );
  }

  return events;
};
