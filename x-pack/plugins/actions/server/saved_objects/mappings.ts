/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

export const actionMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    name: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    actionTypeId: {
      type: 'keyword',
    },
    // NO NEED TO BE INDEXED
    // isMissingSecrets: {
    //   type: 'boolean',
    // },
    // NO NEED TO BE INDEXED
    // config: {
    //   enabled: false,
    //   type: 'object',
    // },
    // NEED TO CHECK WITH KIBANA SECURITY
    // secrets: {
    //   type: 'binary',
    // },
  },
};

export const actionTaskParamsMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    // NO NEED TO BE INDEXED
    // actionId: {
    //   type: 'keyword',
    // },
    // consumer: {
    //   type: 'keyword',
    // },
    // params: {
    //   enabled: false,
    //   type: 'object',
    // },
    // apiKey: {
    //   type: 'binary',
    // },
    // executionId: {
    //   type: 'keyword',
    // },
    // relatedSavedObjects: {
    //   enabled: false,
    //   type: 'object',
    // },
    // source: {
    //   type: 'keyword'
    // }
  },
};

export const connectorTokenMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    connectorId: {
      type: 'keyword',
    },
    tokenType: {
      type: 'keyword',
    },
    // NO NEED TO BE INDEXED
    // token: {
    //   type: 'binary',
    // },
    // expiresAt: {
    //   type: 'date',
    // },
    // createdAt: {
    //   type: 'date',
    // },
    // updatedAt: {
    //   type: 'date',
    // },
  },
};
