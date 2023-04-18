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

export const exceptionsArtifactSavedObjectMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    identifier: {
      type: 'keyword',
    },
    compressionAlgorithm: {
      type: 'keyword',
    },
    encryptionAlgorithm: {
      type: 'keyword',
    },
    encodedSha256: {
      type: 'keyword',
    },
    encodedSize: {
      type: 'long',
    },
    decodedSha256: {
      type: 'keyword',
    },
    decodedSize: {
      type: 'long',
    },
    created: {
      type: 'date',
    },
    body: {
      type: 'binary',
    },
  },
};

export const manifestSavedObjectMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    created: {
      type: 'date',
    },
    schemaVersion: {
      type: 'keyword',
    },
    semanticVersion: {
      type: 'keyword',
    },
    artifacts: {
      type: 'nested',
      properties: {
        policyId: {
          type: 'keyword',
        },
        artifactId: {
          type: 'keyword',
        },
      },
    },
  },
};

export const exceptionsArtifactType: SavedObjectsType = {
  name: exceptionsArtifactSavedObjectType,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: exceptionsArtifactSavedObjectMappings,
};

export const manifestType: SavedObjectsType = {
  name: manifestSavedObjectType,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: manifestSavedObjectMappings,
  migrations,
};
