/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT } from '../../common/constants';
import { connectorMappingsMigrations } from './migrations';

/**
 * The comments in the mapping indicate the additional properties that are stored in Elasticsearch but are not indexed.
 * Remove these comments when https://github.com/elastic/kibana/issues/152756 is resolved.
 */

export const caseConnectorMappingsSavedObjectType: SavedObjectsType = {
  name: CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  mappings: {
    dynamic: false,
    properties: {
      /*
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
      */
      owner: {
        type: 'keyword',
      },
    },
  },
  migrations: connectorMappingsMigrations,
};
