/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicActionsState } from '../../common';

export const dynamicActionsCollector = (state: DynamicActionsState): Record<string, any> => {
  const stats: Record<string, any> = {};

  stats['dynamicActions.count'] = state.events.length;

  const factoryCount: Record<string, number | undefined> = {};

  for (const event of state.events) {
    const factoryId = event.action.factoryId;
    factoryCount[factoryId] = 1 + (factoryCount[factoryId] || 0);
  }

  const factoryIds = Object.keys(factoryCount);

  for (const factoryId of factoryIds) {
    stats[`dynamicActions.actions.${factoryId}.count`] = factoryCount[factoryId];
  }

  return stats;
};
