/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT } from '../../common/constants';
import { connectorMappingsMigrations } from './migrations';

export const caseConnectorMappingsSavedObjectType: SavedObjectsType = {
  name: CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
  hidden: true,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  mappings: {
    properties: {
      mappings: {
        properties: {
          source: {
            type: 'keyword',
          },
          target: {
            type: 'keyword',
          },
          action_type: {
            type: 'keyword',
          },
        },
      },
      owner: {
        type: 'keyword',
      },
    },
  },
  migrations: connectorMappingsMigrations,
};
