/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { NormalizedAlertAction, NormalizedAlertActionWithUuid } from '..';

export function formatActions(
  actions: NormalizedAlertAction[] = []
): NormalizedAlertActionWithUuid[] {
  return actions.map(({ uuid, alertsFilter, ...action }) => ({
    ...action,
    uuid: uuid || v4(),
    alertsFilter: alertsFilter
      ? {
          ...alertsFilter,
          timeframe: alertsFilter.timeframe || null,
          query: alertsFilter.query || null,
        }
      : null,
  }));
}
