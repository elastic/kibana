/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalArtifactSchema, InternalManifestSchema } from './saved_objects';
import { getTranslatedExceptionListMock } from './lists.mock';
import { buildArtifact } from '../../lib/artifacts/lists';
import { ArtifactConstants } from './common';

export const getInternalArtifactMock = async (os?: string): Promise<InternalArtifactSchema> => {
  const osParam = os === undefined ? 'linux' : os;
  return buildArtifact(getTranslatedExceptionListMock(os), osParam, '1.0.0');
};

export const getInternalArtifactsMock = async (): Promise<InternalArtifactSchema[]> => {
  return ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS.map(async (os) => {
    await buildArtifact(getTranslatedExceptionListMock(os), os, '1.0.0');
  });
};

export const getInternalManifestMock = (): InternalManifestSchema => ({
  created: Date.now(),
  ids: [],
});
