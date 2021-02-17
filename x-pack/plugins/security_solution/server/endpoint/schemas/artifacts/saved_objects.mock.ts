/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildArtifact,
  maybeCompressArtifact,
  isCompressed,
  ArtifactConstants,
} from '../../lib/artifacts';
import { getTranslatedExceptionListMock } from './lists.mock';
import {
  InternalManifestSchema,
  internalArtifactCompleteSchema,
  InternalArtifactCompleteSchema,
} from './saved_objects';

const compressArtifact = async (artifact: InternalArtifactCompleteSchema) => {
  const compressedArtifact = await maybeCompressArtifact(artifact);
  if (!isCompressed(compressedArtifact)) {
    throw new Error(`Unable to compress artifact: ${artifact.identifier}`);
  } else if (!internalArtifactCompleteSchema.is(compressedArtifact)) {
    throw new Error(`Incomplete artifact detected: ${artifact.identifier}`);
  }
  return compressedArtifact;
};

export const getInternalArtifactMock = async (
  os: string,
  schemaVersion: string,
  opts?: { compress: boolean },
  artifactName: string = ArtifactConstants.GLOBAL_ALLOWLIST_NAME
): Promise<InternalArtifactCompleteSchema> => {
  const artifact = await buildArtifact(
    getTranslatedExceptionListMock(),
    schemaVersion,
    os,
    artifactName
  );
  return opts?.compress ? compressArtifact(artifact) : artifact;
};

export const getEmptyInternalArtifactMock = async (
  os: string,
  schemaVersion: string,
  opts?: { compress: boolean },
  artifactName: string = ArtifactConstants.GLOBAL_ALLOWLIST_NAME
): Promise<InternalArtifactCompleteSchema> => {
  const artifact = await buildArtifact({ entries: [] }, schemaVersion, os, artifactName);
  return opts?.compress ? compressArtifact(artifact) : artifact;
};

export const getInternalArtifactMockWithDiffs = async (
  os: string,
  schemaVersion: string,
  opts?: { compress: boolean }
): Promise<InternalArtifactCompleteSchema> => {
  const mock = getTranslatedExceptionListMock();
  mock.entries.pop();
  const artifact = await buildArtifact(
    mock,
    schemaVersion,
    os,
    ArtifactConstants.GLOBAL_ALLOWLIST_NAME
  );
  return opts?.compress ? compressArtifact(artifact) : artifact;
};

export const getInternalManifestMock = (): InternalManifestSchema => ({
  artifacts: [],
  schemaVersion: 'v1',
  semanticVersion: '1.0.0',
});
