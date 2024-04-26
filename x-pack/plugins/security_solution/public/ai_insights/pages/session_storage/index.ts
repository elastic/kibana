/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Replacements } from '@kbn/elastic-assistant-common';
import type { AlertsInsight } from '../../types';

export interface CachedInsights {
  connectorId: string;
  updated: Date;
  insights: AlertsInsight[];
  replacements: Replacements;
}

export const encodeCachedInsights = (
  cachedInsights: Record<string, CachedInsights>
): string | null => {
  try {
    return JSON.stringify(cachedInsights, null, 2);
  } catch {
    return null;
  }
};

export const decodeCachedInsights = (
  cachedInsights: string
): Record<string, CachedInsights> | null => {
  try {
    return JSON.parse(cachedInsights);
  } catch {
    return null;
  }
};
