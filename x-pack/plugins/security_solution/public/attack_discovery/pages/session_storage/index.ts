/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Replacements } from '@kbn/elastic-assistant-common';
import { isEmpty } from 'lodash/fp';

import type { AttackDiscovery, GenerationInterval } from '../../types';

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
    return JSON.stringify(cachedAttackDiscoveries);
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

export const getSessionStorageCachedAttackDiscoveries = (
  key: string
): Record<string, CachedAttackDiscoveries> | null => {
  if (!isEmpty(key)) {
    return decodeCachedAttackDiscoveries(sessionStorage.getItem(key) ?? '');
  }

  return null;
};

export const setSessionStorageCachedAttackDiscoveries = ({
  key,
  cachedAttackDiscoveries,
}: {
  key: string;
  cachedAttackDiscoveries: Record<string, CachedAttackDiscoveries>;
}) => {
  if (!isEmpty(key)) {
    const encoded = encodeCachedAttackDiscoveries(cachedAttackDiscoveries);

    if (encoded != null) {
      sessionStorage.setItem(key, encoded);
    }
  }
};

export const encodeGenerationIntervals = (
  generationIntervals: Record<string, GenerationInterval[]>
): string | null => {
  try {
    return JSON.stringify(generationIntervals);
  } catch {
    return null;
  }
};

export const decodeGenerationIntervals = (
  generationIntervals: string
): Record<string, GenerationInterval[]> | null => {
  const parseDate = (key: string, value: unknown) => {
    if (key === 'date' && typeof value === 'string') {
      return new Date(value);
    } else if (key === 'date' && typeof value !== 'string') {
      throw new Error('Invalid date');
    } else {
      return value;
    }
  };

  try {
    return JSON.parse(generationIntervals, parseDate);
  } catch {
    return null;
  }
};

export const getLocalStorageGenerationIntervals = (
  key: string
): Record<string, GenerationInterval[]> | null => {
  if (!isEmpty(key)) {
    return decodeGenerationIntervals(localStorage.getItem(key) ?? '');
  }

  return null;
};

export const setLocalStorageGenerationIntervals = ({
  key,
  generationIntervals,
}: {
  key: string;
  generationIntervals: Record<string, GenerationInterval[]>;
}) => {
  if (!isEmpty(key)) {
    const encoded = encodeGenerationIntervals(generationIntervals);

    if (encoded != null) {
      localStorage.setItem(key, encoded);
    }
  }
};
