/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicActionsState } from '../../common';
import { ActionFactory } from '../types';

export const dynamicActionFactoriesCollector = (
  getActionFactory: (id: string) => undefined | ActionFactory,
  state: DynamicActionsState,
  stats: Record<string, any>
): Record<string, any> => {
  for (const event of state.events) {
    const factory = getActionFactory(event.action.factoryId);

    if (factory) {
      stats = factory.telemetry(event, stats);
    }
  }

  return stats;
};
