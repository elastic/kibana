/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsType } from '../../../../../src/core/server/saved_objects/types';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export const metricsExplorerViewSavedObjectName = 'metrics-explorer-view';

export const metricsExplorerViewSavedObjectType: SavedObjectsType = {
  name: metricsExplorerViewSavedObjectName,
  hidden: false,
  namespaceType: 'single',
  management: {
    importableAndExportable: true,
  },
  mappings: {
    dynamic: false,
    properties: {},
  },
};
