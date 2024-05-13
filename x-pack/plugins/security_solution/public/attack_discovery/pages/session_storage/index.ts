/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Replacements } from '@kbn/elastic-assistant-common';
import type { AttackDiscovery } from '../../types';

export interface CachedAttackDiscoveries {
  connectorId: string;
  updated: Date;
  attackDiscoveries: AttackDiscovery[];
  replacements: Replacements;
}

export const encodeCachedAttackDiscoveries = (
  cachedAttackDiscoveries: Record<string, CachedAttackDiscoveries>
): string | null => {
  try {
    return JSON.stringify(cachedAttackDiscoveries, null, 2);
  } catch {
    return null;
  }
};

export const decodeCachedAttackDiscoveries = (
  cachedAttackDiscoveries: string
): Record<string, CachedAttackDiscoveries> | null => {
  try {
    return JSON.parse(cachedAttackDiscoveries);
  } catch {
    return null;
  }
};
