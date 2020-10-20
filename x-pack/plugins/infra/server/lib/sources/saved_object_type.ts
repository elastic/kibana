/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';
import { addNewIndexingStrategyIndexNames } from './migrations/7_9_0_add_new_indexing_strategy_index_names';

export const infraSourceConfigurationSavedObjectName = 'infrastructure-ui-source';

export const infraSourceConfigurationSavedObjectType: SavedObjectsType = {
  name: infraSourceConfigurationSavedObjectName,
  hidden: false,
  namespaceType: 'single',
  management: {
    importableAndExportable: true,
  },
  mappings: {
    dynamic: false,
    properties: {},
  },
  migrations: {
    '7.9.0': addNewIndexingStrategyIndexNames,
  },
};
