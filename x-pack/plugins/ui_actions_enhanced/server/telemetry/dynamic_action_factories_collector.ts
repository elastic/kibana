/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicActionsState } from '../../common';
import { ActionFactory } from '../types';

export const dynamicActionFactoriesCollector = (
  getActionFactory: (id: string) => undefined | ActionFactory,
  state: DynamicActionsState,
  stats: Record<string, string | number | boolean>
): Record<string, string | number | boolean> => {
  for (const event of state.events) {
    const factory = getActionFactory(event.action.factoryId);

    if (factory) {
      stats = factory.telemetry(event, stats);
    }
  }

  return stats;
};
