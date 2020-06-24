/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalArtifactSchema, InternalManifestSchema } from './saved_objects';
import { getTranslatedExceptionListMock } from './lists.mock';
import { ArtifactConstants, buildArtifact } from '../../lib/artifacts';

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
  mock.exceptions_list.pop();
  return buildArtifact(mock, os, schemaVersion);
};

export const getInternalArtifactsMock = async (
  os: string,
  schemaVersion: string
): Promise<InternalArtifactSchema[]> => {
  return ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS.map(async () => {
    await buildArtifact(getTranslatedExceptionListMock(), os, schemaVersion);
  });
};

export const getInternalManifestMock = (): InternalManifestSchema => ({
  created: Date.now(),
  ids: [],
});
