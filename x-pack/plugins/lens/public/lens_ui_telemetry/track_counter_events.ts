/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten, uniq } from 'lodash';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { IndexPatternLayer } from '..';

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

export const trackLensOperationsEvents = (layers?: Record<string, IndexPatternLayer>) => {
  const usageCollection = getUsageCollectionStart();

  const additionalEvents = {
    time_shift: false,
    filter: false,
  };

  if (usageCollection) {
    const operations = uniq(
      flatten(
        Object.values(layers ?? {}).map((l) =>
          Object.values(l.columns).map((c) => {
            if (c.timeShift) {
              additionalEvents.time_shift = true;
            }
            if (c.filter) {
              additionalEvents.filter = true;
            }
            return c.operationType;
          })
        )
      )
    );

    trackUiCounterEvents(
      [
        ...operations,
        ...Object.entries(additionalEvents).reduce<string[]>((acc, [key, isActive]) => {
          if (isActive) {
            acc.push(key);
          }
          return acc;
        }, []),
      ].map((item) => `dimension_${item}`)
    );
  }
};

export const trackExecutionContextEvents = (context?: KibanaExecutionContext) => {
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

  trackUiCounterEvents(events);
};
