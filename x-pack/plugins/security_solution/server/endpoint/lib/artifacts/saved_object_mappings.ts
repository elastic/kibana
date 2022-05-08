/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';

import { ArtifactConstants, ManifestConstants } from './common';
import { migrations } from './migrations';

export const exceptionsArtifactSavedObjectType = ArtifactConstants.SAVED_OBJECT_TYPE;
export const manifestSavedObjectType = ManifestConstants.SAVED_OBJECT_TYPE;

export const exceptionsArtifactSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    identifier: {
      type: 'keyword',
    },
    compressionAlgorithm: {
      type: 'keyword',
      index: false,
    },
    encryptionAlgorithm: {
      type: 'keyword',
      index: false,
    },
    encodedSha256: {
      type: 'keyword',
    },
    encodedSize: {
      type: 'long',
      index: false,
    },
    decodedSha256: {
      type: 'keyword',
      index: false,
    },
    decodedSize: {
      type: 'long',
      index: false,
    },
    created: {
      type: 'date',
      index: false,
    },
    body: {
      type: 'binary',
    },
  },
};

export const manifestSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    created: {
      type: 'date',
      index: false,
    },
    schemaVersion: {
      type: 'keyword',
    },
    semanticVersion: {
      type: 'keyword',
      index: false,
    },
    artifacts: {
      type: 'nested',
      properties: {
        policyId: {
          type: 'keyword',
          index: false,
        },
        artifactId: {
          type: 'keyword',
          index: false,
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
