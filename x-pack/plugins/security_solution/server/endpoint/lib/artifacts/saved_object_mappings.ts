/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';

import { ArtifactConstants, ManifestConstants } from './common';
import { migrations } from './migrations';

export const exceptionsArtifactSavedObjectType = ArtifactConstants.SAVED_OBJECT_TYPE;
export const manifestSavedObjectType = ManifestConstants.SAVED_OBJECT_TYPE;

export const manifestSavedObjectMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    created: {
      type: 'date',
    },
    schemaVersion: {
      type: 'keyword',
    },
    artifacts: {
      type: 'nested',
    },
  },
};

export const manifestType: SavedObjectsType = {
  name: manifestSavedObjectType,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: manifestSavedObjectMappings,
  migrations,
};
