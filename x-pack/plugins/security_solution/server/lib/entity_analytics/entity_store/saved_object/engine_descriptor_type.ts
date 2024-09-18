/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';

export const entityEngineDescriptorTypeName = 'entity-engine-status';

export const entityEngineDescriptorTypeMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    indexPattern: {
      type: 'keyword',
    },
    filter: {
      type: 'keyword',
    },
    type: {
      type: 'keyword', // EntityType: user | host
    },
    status: {
      type: 'keyword', // EngineStatus: installing | started | stopped
    },
  },
};
export const entityEngineDescriptorType: SavedObjectsType = {
  name: entityEngineDescriptorTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: entityEngineDescriptorTypeMappings,
};
