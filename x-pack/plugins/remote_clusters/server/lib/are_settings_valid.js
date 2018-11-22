/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export function areSettingsValid(transientSettings = {}, persistentSettings = {}) {
  const {
    seeds: transientSeeds,
    skipUnavailable: transientSkipUnavailable,
  } = transientSettings;
  const {
    seeds: persistentSeeds,
    skipUnavailable: persistentSkipUnavailable,
  } = persistentSettings;

  const hasTransientSeeds = transientSeeds && transientSeeds.length;
  const hasPersistentSeeds = persistentSeeds && persistentSeeds.length;

  // Check that at least one type of setting exists
  if(!transientSettings && !persistentSettings) {
    return false;
  }

  // Check that at least one seed across both types exists
  if(!hasTransientSeeds && !hasPersistentSeeds) {
    return false;
  }

  // Check that other settings are not being set without corresponding seeds on the same type
  if(
    (!hasTransientSeeds && typeof transientSkipUnavailable === 'boolean')
    || (!hasPersistentSeeds && typeof persistentSkipUnavailable === 'boolean')
  ) {
    return false;
  }

  return true;
}
