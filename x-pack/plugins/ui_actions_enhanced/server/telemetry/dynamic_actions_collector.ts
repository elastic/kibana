/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicActionsState } from '../../common';
import { getMetricKey } from './get_metric_key';

export const dynamicActionsCollector = (state: DynamicActionsState): Record<string, any> => {
  const stats: Record<string, any> = {};

  stats[getMetricKey('count')] = state.events.length;

  for (const event of state.events) {
    const factoryId = event.action.factoryId;
    const factoryCountMetric = getMetricKey(`actions.${factoryId}.count`);

    stats[factoryCountMetric] = 1 + (stats[factoryCountMetric] || 0);

    for (const trigger of event.triggers) {
      const triggerCountMetric = getMetricKey(`triggers.${trigger}.count`);
      const actionXTriggerCountMetric = getMetricKey(
        `action_triggers.${factoryId}_${trigger}.count`
      );

      stats[triggerCountMetric] = 1 + (stats[triggerCountMetric] || 0);
      stats[actionXTriggerCountMetric] = 1 + (stats[actionXTriggerCountMetric] || 0);
    }
  }

  return stats;
};
