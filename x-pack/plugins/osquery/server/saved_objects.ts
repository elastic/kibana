/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';

import {
  savedQueryType,
  packType,
  packAssetType,
  usageMetricType,
} from './lib/saved_query/saved_object_mappings';

export const initSavedObjects = (savedObjects: CoreSetup['savedObjects']) => {
  savedObjects.registerType(usageMetricType);
  savedObjects.registerType(savedQueryType);
  savedObjects.registerType(packType);
  savedObjects.registerType(packAssetType);
};
