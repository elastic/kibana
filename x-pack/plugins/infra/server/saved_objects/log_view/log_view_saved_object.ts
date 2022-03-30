/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'src/core/server';

export const logViewSavedObjectName = 'infrastructure-monitoring-log-view';

export const logViewSavedObjectType: SavedObjectsType = {
  name: logViewSavedObjectName,
  hidden: false,
  namespaceType: 'multiple-isolated',
  management: {
    defaultSearchField: 'name',
    icon: 'logsApp',
    importableAndExportable: true,
  },
  mappings: {
    dynamic: false,
    properties: {
      name: {
        type: 'text',
      },
    },
  },
  migrations: {},
};
