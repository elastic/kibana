/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';

export const riskEngineConfigurationTypeName = 'risk-engine-configuration';

export const riskEngineConfigurationTypeMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    dataViewId: {
      type: 'keyword',
    },
    enabled: {
      type: 'boolean',
    },
    filter: {
      dynamic: false,
      properties: {},
    },
    identifierType: {
      type: 'keyword',
    },
    interval: {
      type: 'keyword',
    },
    pageSize: {
      type: 'integer',
    },
    alertSampleSizePerShard: {
      type: 'integer',
    },
    range: {
      properties: {
        start: {
          type: 'keyword',
        },
        end: {
          type: 'keyword',
        },
      },
    },
  },
};

const version1: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        alertSampleSizePerShard: { type: 'integer' },
      },
    },
  ],
};

export const riskEngineConfigurationType: SavedObjectsType = {
  name: riskEngineConfigurationTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: riskEngineConfigurationTypeMappings,
  modelVersions: {
    1: version1,
  },
};
