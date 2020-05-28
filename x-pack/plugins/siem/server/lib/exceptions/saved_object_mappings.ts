/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from '../../../../../../src/core/server';

export const exceptionsArtifactSavedObjectType = 'siem-exceptions-artifact';

export const exceptionsArtifactSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    // e.g. 'global-whitelist'
    name: {
      type: 'keyword',
    },
    schemaVersion: {
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
  },
};

export const type: SavedObjectsType = {
  name: exceptionsArtifactSavedObjectType,
  hidden: false, // TODO: should these be hidden?
  namespaceType: 'agnostic',
  mappings: exceptionsArtifactSavedObjectMappings,
};
