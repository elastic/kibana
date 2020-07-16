/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ArtifactConstants, buildArtifact } from '../../lib/artifacts';
import { getTranslatedExceptionListMock } from './lists.mock';
import { InternalArtifactSchema, InternalManifestSchema } from './saved_objects';

export const getInternalArtifactMock = async (
  os: string,
  schemaVersion: string
): Promise<InternalArtifactSchema> => {
  return buildArtifact(getTranslatedExceptionListMock(), os, schemaVersion);
};

export const getInternalArtifactMockWithDiffs = async (
  os: string,
  schemaVersion: string
): Promise<InternalArtifactSchema> => {
  const mock = getTranslatedExceptionListMock();
  mock.entries.pop();
  return buildArtifact(mock, os, schemaVersion);
};

export const getInternalArtifactsMock = async (
  os: string,
  schemaVersion: string
): Promise<InternalArtifactSchema[]> => {
  // TODO: fix this type error
  return ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS.map<InternalArtifactSchema[]>(async () => {
    await buildArtifact(getTranslatedExceptionListMock(), os, schemaVersion);
  });
};

export const getInternalManifestMock = (): InternalManifestSchema => ({
  ids: [],
});
