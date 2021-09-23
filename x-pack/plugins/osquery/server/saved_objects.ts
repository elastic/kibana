/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '../../../../src/core/server';

import { OsqueryAppContext } from './lib/osquery_app_context_services';
import { savedQueryType, packType } from './lib/saved_query/saved_object_mappings';
import { usageMetricType } from './routes/usage/saved_object_mappings';

const types = [savedQueryType, packType];

export const savedObjectTypes = types.map((type) => type.name);

export const initSavedObjects = (
  savedObjects: CoreSetup['savedObjects'],
  osqueryContext: OsqueryAppContext
) => {
  const config = osqueryContext.config();

  savedObjects.registerType(usageMetricType);

  if (config.savedQueries) {
    savedObjects.registerType(savedQueryType);
  }

  if (config.packs) {
    savedObjects.registerType(packType);
  }
};
