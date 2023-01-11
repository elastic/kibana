/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { produce } from 'immer';
import type { SavedObjectsType } from '@kbn/core/server';
import {
  savedQuerySavedObjectType,
  packSavedObjectType,
  packAssetSavedObjectType,
  usageMetricSavedObjectType,
} from '../../../common/types';

export const usageMetricSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    count: {
      type: 'long',
    },
    errors: {
      type: 'long',
    },
  },
};

export const usageMetricType: SavedObjectsType = {
  name: usageMetricSavedObjectType,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: usageMetricSavedObjectMappings,
};

export const savedQuerySavedObjectMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    description: {
      type: 'text',
    },
    id: {
      type: 'keyword',
    },
    query: {
      type: 'text',
    },
    created_at: {
      type: 'date',
    },
    created_by: {
      type: 'text',
    },
    platform: {
      type: 'keyword',
    },
    version: {
      type: 'keyword',
    },
    updated_at: {
      type: 'date',
    },
    updated_by: {
      type: 'text',
    },
    interval: {
      type: 'keyword',
    },
    ecs_mapping: {
      type: 'object',
      enabled: false,
    },
  },
};

export const savedQueryType: SavedObjectsType = {
  name: savedQuerySavedObjectType,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: savedQuerySavedObjectMappings,
  management: {
    importableAndExportable: true,
    getTitle: (savedObject) => savedObject.attributes.id,
    getEditUrl: (savedObject) => `/saved_queries/${savedObject.id}/edit`,
    getInAppUrl: (savedObject) => ({
      path: `/app/osquery/saved_queries/${savedObject.id}`,
      uiCapabilitiesPath: 'osquery.read',
    }),
    onExport: (context, objects) =>
      produce(objects, (draft) => {
        draft.forEach((savedQuerySO) => {
          // Only prebuilt saved queries should have a version
          if (savedQuerySO.attributes.version) {
            savedQuerySO.attributes.id += '_copy';
            delete savedQuerySO.attributes.version;
          }
        });

        return draft;
      }),
  },
};

export const packSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    description: {
      type: 'text',
    },
    name: {
      type: 'text',
    },
    created_at: {
      type: 'date',
    },
    created_by: {
      type: 'keyword',
    },
    updated_at: {
      type: 'date',
    },
    updated_by: {
      type: 'keyword',
    },
    enabled: {
      type: 'boolean',
    },
    shards: {
      type: 'object',
      enabled: false,
    },
    version: {
      type: 'long',
    },
    queries: {
      dynamic: false,
      properties: {
        id: {
          type: 'keyword',
        },
        query: {
          type: 'text',
        },
        interval: {
          type: 'text',
        },
        platform: {
          type: 'keyword',
        },
        version: {
          type: 'keyword',
        },
        ecs_mapping: {
          type: 'object',
          enabled: false,
        },
      },
    },
  },
};

export const packType: SavedObjectsType = {
  name: packSavedObjectType,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: packSavedObjectMappings,
  management: {
    defaultSearchField: 'name',
    importableAndExportable: true,
    getTitle: (savedObject) => `Pack: ${savedObject.attributes.name}`,
    getEditUrl: (savedObject) => `/packs/${savedObject.id}/edit`,
    getInAppUrl: (savedObject) => ({
      path: `/app/osquery/packs/${savedObject.id}`,
      uiCapabilitiesPath: 'osquery.read',
    }),
    onExport: (context, objects) =>
      produce(objects, (draft) => {
        draft.forEach((packSO) => {
          packSO.references = [];
          // Only prebuilt packs should have a version
          if (packSO.attributes.version) {
            packSO.attributes.name += '_copy';
            delete packSO.attributes.version;
          }
        });

        return draft;
      }),
  },
};

export const packAssetSavedObjectMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    description: {
      type: 'text',
    },
    name: {
      type: 'text',
    },
    version: {
      type: 'long',
    },
    shards: {
      type: 'object',
      enabled: false,
    },
    queries: {
      dynamic: false,
      properties: {
        id: {
          type: 'keyword',
        },
        query: {
          type: 'text',
        },
        interval: {
          type: 'text',
        },
        platform: {
          type: 'keyword',
        },
        version: {
          type: 'keyword',
        },
        ecs_mapping: {
          type: 'object',
          enabled: false,
        },
      },
    },
  },
};

export const packAssetType: SavedObjectsType = {
  name: packAssetSavedObjectType,
  hidden: false,
  management: {
    importableAndExportable: true,
    visibleInManagement: false,
  },
  namespaceType: 'agnostic',
  mappings: packAssetSavedObjectMappings,
};
