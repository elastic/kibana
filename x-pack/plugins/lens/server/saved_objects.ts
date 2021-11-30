/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/server';
import { getEditPath } from '../common';
import { migrations } from './migrations/saved_object_migrations';

export function setupSavedObjects(core: CoreSetup) {
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
    migrations,
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
    name: 'palette',
    hidden: false,
    namespaceType: 'multiple-isolated',
    management: {
      icon: 'brush',
      defaultSearchField: 'title',
      importableAndExportable: true,
      getTitle: (obj: { attributes: { title: string } }) => obj.attributes.title,
    },
    mappings: {
      properties: {
        title: {
          type: 'text',
        },
        name: {
          type: 'text',
        },
        params: {
          type: 'flattened',
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
