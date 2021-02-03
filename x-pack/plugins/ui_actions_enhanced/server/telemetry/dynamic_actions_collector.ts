/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicActionsState } from '../../common';
import { getMetricKey } from './get_metric_key';

export const dynamicActionsCollector = (
  state: DynamicActionsState,
  stats: Record<string, any>
): Record<string, any> => {
  const countMetricKey = getMetricKey('count');

  stats[countMetricKey] = state.events.length + (stats[countMetricKey] || 0);

  for (const event of state.events) {
    const factoryId = event.action.factoryId;
    const actionCountMetric = getMetricKey(`actions.${factoryId}.count`);

    stats[actionCountMetric] = 1 + (stats[actionCountMetric] || 0);

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
