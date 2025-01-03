/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';

export const [getUsageCollectionStart, setUsageCollectionStart] =
  createGetterSetter<UsageCollectionStart>('UsageCollection', false);

const extractContainerType = (context?: KibanaExecutionContext): string | undefined => {
  if (context) {
    const recursiveGet = (item: KibanaExecutionContext): KibanaExecutionContext | undefined => {
      if (item.type) {
        return item;
      } else if (item.child) {
        return recursiveGet(item.child);
      }
    };
    return recursiveGet(context)?.type;
  }
};

const RENDER_EVENT_PREFIX = `render_lens_`;

const SAVE_EVENT_PREFIX = `save_lens_`;

/** @internal **/
export const trackSaveUiCounterEvents = (
  events: string | string[],
  context?: KibanaExecutionContext
) => trackUiCounterEvents(events, context, SAVE_EVENT_PREFIX);

/** @internal **/
export const trackUiCounterEvents = (
  events: string | string[],
  context?: KibanaExecutionContext,
  eventPrefix = RENDER_EVENT_PREFIX
) => {
  const usageCollection = getUsageCollectionStart();
  const containerType = extractContainerType(context) ?? 'application';

  Object.entries(groupBy(Array.isArray(events) ? events : [events])).forEach(([key, counter]) => {
    usageCollection?.reportUiCounter(
      containerType,
      METRIC_TYPE.COUNT,
      `${eventPrefix}${key}`,
      counter.length
    );
  });
};

/** @internal **/
export const getExecutionContextEvents = (context?: KibanaExecutionContext) => {
  const events = [];

  if (context?.type) {
    events.push(`vis_${context.type}`);
  }

  return events;
};
