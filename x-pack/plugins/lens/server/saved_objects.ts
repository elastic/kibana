/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/server';
import {
  mergeMigrationFunctionMaps,
  MigrateFunctionsObject,
} from '../../../../src/plugins/kibana_utils/common';
import { getEditPath } from '../common';
import { migrations } from './migrations/saved_object_migrations';

export function setupSavedObjects(core: CoreSetup, filterMigrations: MigrateFunctionsObject) {
  core.savedObjects.registerType({
    name: 'lens',
    hidden: false,
    namespaceType: 'multiple-isolated',
    convertToMultiNamespaceTypeVersion: '8.0.0',
    management: {
      icon: 'lensApp',
      defaultSearchField: 'title',
      importableAndExportable: true,
      getTitle: (obj: { attributes: { title: string } }) => obj.attributes.title,
      getInAppUrl: (obj: { id: string }) => ({
        path: `/app/lens${getEditPath(obj.id)}`,
        uiCapabilitiesPath: 'visualize.show',
      }),
    },
    migrations: mergeMigrationFunctionMaps(
      filterMigrations,
      migrations as unknown as MigrateFunctionsObject
    ),
    mappings: {
      properties: {
        title: {
          type: 'text',
        },
        description: {
          type: 'text',
        },
        visualizationType: {
          type: 'keyword',
        },
        state: {
          type: 'flattened',
        },
        expression: {
          index: false,
          doc_values: false,
          type: 'keyword',
        },
      },
    },
  });

  core.savedObjects.registerType({
    name: 'lens-ui-telemetry',
    hidden: false,
    namespaceType: 'single',
    mappings: {
      properties: {
        name: {
          type: 'keyword',
        },
        type: {
          type: 'keyword',
        },
        date: {
          type: 'date',
        },
        count: {
          type: 'integer',
        },
      },
    },
  });
}
