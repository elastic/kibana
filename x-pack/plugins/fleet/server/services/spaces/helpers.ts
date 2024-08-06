/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';
import { getSettings } from '../settings';

let CACHE_SPACE_AWARENESS = false;

/**
 * Return true if user optin for the space awareness feature.
 */
export async function isSpaceAwarenessEnabled(): Promise<boolean> {
  if (!appContextService.getExperimentalFeatures().useSpaceAwareness) {
    return false;
  }

  if (CACHE_SPACE_AWARENESS) {
    return true;
  }

  const settings = await getSettings(appContextService.getInternalUserSOClient()).catch((error) => {
    if (!error.isBoom && error.output.statusCode !== 404) {
      throw error;
    }
  });

  CACHE_SPACE_AWARENESS = settings?.use_space_awareness_migration_status === 'success' ?? false;

  return CACHE_SPACE_AWARENESS;
}

/**
 * Return true if space awareness migration is currently running
 */
export async function isSpaceAwarenessMigrationPending(): Promise<boolean> {
  if (!appContextService.getExperimentalFeatures().useSpaceAwareness) {
    return false;
  }

  if (CACHE_SPACE_AWARENESS) {
    return false;
  }

  const settings = await getSettings(appContextService.getInternalUserSOClient()).catch((error) => {
    if (!error.isBoom && error.output.statusCode !== 404) {
      throw error;
    }
  });

  if (
    settings?.use_space_awareness_migration_status === 'pending' &&
    settings?.use_space_awareness_migration_started_at &&
    new Date(settings?.use_space_awareness_migration_started_at).getTime() >
      Date.now() - 60 * 60 * 100
  ) {
    return true;
  }
  return false;
}

/**
 * Clear space awareness cache (for testing purpose only)
 */
export function _clearSpaceAwarenessCache() {
  CACHE_SPACE_AWARENESS = false;
}
