/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicActionsState } from '../../common';

export const uiActionsCollector = (state: DynamicActionsState, stats: Record<string, any>) => {
  stats.dynamicActionCount = state.events.length;

  const factoryFrequency: Record<string, number | undefined> = {};

  for (const event of state.events) {
    const factoryId = event.action.factoryId;
    factoryFrequency[factoryId] = 1 + (factoryFrequency[factoryId] || 0);
  }

  const factoryIds = Object.keys(factoryFrequency);

  for (const factoryId of factoryIds) {
    stats[`dynamicAction.${factoryId}.count`] = factoryFrequency[factoryId];
  }
};
