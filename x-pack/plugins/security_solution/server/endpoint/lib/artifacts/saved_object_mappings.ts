/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from '../../../../../../../src/core/server';

import { ArtifactConstants, ManifestConstants } from './common';

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
      index: false,
    },
  },
};

export const manifestSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    created: {
      type: 'date',
      index: false,
    },
    // array of doc ids
    ids: {
      type: 'keyword',
      index: false,
    },
  },
};

export const exceptionsArtifactType: SavedObjectsType = {
  name: exceptionsArtifactSavedObjectType,
  hidden: false, // TODO: should these be hidden?
  namespaceType: 'agnostic',
  mappings: exceptionsArtifactSavedObjectMappings,
};

export const manifestType: SavedObjectsType = {
  name: manifestSavedObjectType,
  hidden: false, // TODO: should these be hidden?
  namespaceType: 'agnostic',
  mappings: manifestSavedObjectMappings,
};
