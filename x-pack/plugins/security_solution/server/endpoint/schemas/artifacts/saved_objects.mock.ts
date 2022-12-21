/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildArtifact, ArtifactConstants } from '../../lib/artifacts';
import { getTranslatedExceptionListMock } from './lists.mock';
import type { InternalManifestSchema, InternalArtifactCompleteSchema } from './saved_objects';

export const getInternalArtifactMock = async (
  os: string,
  schemaVersion: string,
  artifactName: string = ArtifactConstants.GLOBAL_ALLOWLIST_NAME
): Promise<InternalArtifactCompleteSchema> => {
  const artifact = await buildArtifact(
    getTranslatedExceptionListMock(),
    schemaVersion,
    os,
    artifactName
  );
  return artifact;
};

export const getEmptyInternalArtifactMock = async (
  os: string,
  schemaVersion: string,
  artifactName: string = ArtifactConstants.GLOBAL_ALLOWLIST_NAME
): Promise<InternalArtifactCompleteSchema> => {
  const artifact = await buildArtifact({ entries: [] }, schemaVersion, os, artifactName);
  return artifact;
};

export const getInternalArtifactMockWithDiffs = async (
  os: string,
  schemaVersion: string
): Promise<InternalArtifactCompleteSchema> => {
  const mock = getTranslatedExceptionListMock();
  mock.entries.pop();
  const artifact = await buildArtifact(
    mock,
    schemaVersion,
    os,
    ArtifactConstants.GLOBAL_ALLOWLIST_NAME
  );
  return artifact;
};

export const getInternalManifestMock = (): InternalManifestSchema => ({
  artifacts: [],
  schemaVersion: 'v1',
  semanticVersion: '1.0.0',
});
