/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/server';
import { getEditPath } from '../common';

export function setupSavedObjects(core: CoreSetup) {
  core.savedObjects.registerType({
    name: 'lens',
    hidden: false,
    namespaceAgnostic: false,
    management: {
      icon: 'lensApp',
      defaultSearchField: 'title',
      importableAndExportable: true,
      getTitle: (obj: { attributes: { title: string } }) => obj.attributes.title,
      getInAppUrl: (obj: { id: string }) => ({
        path: getEditPath(obj.id),
        uiCapabilitiesPath: 'visualize.show',
      }),
    },
    mappings: {
      properties: {
        title: {
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
          type: 'keyword',
        },
      },
    },
  });

  core.savedObjects.registerType({
    name: 'lens-ui-telemetry',
    hidden: false,
    namespaceAgnostic: false,
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
