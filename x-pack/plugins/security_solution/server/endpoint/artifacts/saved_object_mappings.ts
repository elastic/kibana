/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from '../../../../../../src/core/server';

export const exceptionsArtifactSavedObjectType = 'securitySolution:endpoint:exceptions-artifact';
export const manifestSavedObjectType = 'securitySolution:endpoint:artifact-manifest';

export const exceptionsArtifactSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    // e.g. 'global-whitelist-windows-1.0.0'
    identifier: {
      type: 'keyword',
    },
    sha256: {
      type: 'keyword',
    },
    encoding: {
      type: 'keyword',
    },
    created: {
      type: 'date',
    },
    body: {
      type: 'binary',
    },
    size: {
      type: 'long',
    },
  },
};

export const manifestSavedObjectMappings: SavedObjectType['mappings'] = {
  properties: {
    // manifest sequence number
    manifestVersion: {
      type: 'long',
    },
    // manifest schema version
    schemaVersion: {
      type: 'keyword',
    },
    // array of doc ids
    ids: {
      type: 'keyword',
    },
  },
}

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
