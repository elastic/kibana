/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalArtifactSchema, InternalManifestSchema } from './saved_objects';

// TODO: os type
export const getInternalArtifactMock = (os?: string): InternalArtifactSchema => ({
  identifier: '',
  sha256: '',
  encoding: '',
  created: '',
  body: '',
  size: '',
});

export const getInternalArtifactsMock = (): InternalArtifactSchema[] => [{}, {}];

export const getInternalManifestMock = (): InternalManifestSchema => ({
  created: Date.now(),
  ids: [],
});
