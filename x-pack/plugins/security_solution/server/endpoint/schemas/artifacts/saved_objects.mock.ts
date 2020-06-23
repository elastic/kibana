/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalArtifactSchema, InternalManifestSchema } from './saved_objects';

export const getInternalArtifactSchemaMock = (): InternalArtifactSchema => ({
  identifier: '',
  sha256: '',
  encoding: '',
  created: '',
  body: '',
  size: '',
});

export const getInternalManifestSchemaMock = (): InternalManifestSchema => ({
  created: Date.now(),
  ids: [],
});
