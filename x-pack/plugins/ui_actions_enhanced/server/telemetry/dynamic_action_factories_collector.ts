/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicActionsState } from '../../common';
import { ActionFactory } from '../types';

export const dynamicActionFactoriesCollector = (
  getActionFactory: (id: string) => undefined | ActionFactory,
  state: DynamicActionsState
): Record<string, any> => {
  const stats: Record<string, any> = {};

  for (const event of state.events) {
    const factory = getActionFactory(event.action.factoryId);
    if (factory) {
      let factoryStats: Record<string, any> = {};
      factoryStats = factory.telemetry(event, factoryStats);
      for (const [stat, value] of Object.entries(factoryStats)) {
        stats[`dynamicActions.factories.${factory.id}.${stat}`] = value;
      }
    }
  }

  return stats;
};
