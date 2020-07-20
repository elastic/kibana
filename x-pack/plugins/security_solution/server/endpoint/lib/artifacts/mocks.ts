/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalArtifactCompleteSchema } from '../../schemas/artifacts';
import {
  getInternalArtifactMock,
  getInternalArtifactMockWithDiffs,
  getEmptyInternalArtifactMock,
} from '../../schemas/artifacts/saved_objects.mock';
import { ArtifactConstants } from './common';
import { Manifest } from './manifest';

export const getMockArtifacts = async (opts?: { compress: boolean }) => {
  return Promise.all(
    ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS.map<Promise<InternalArtifactCompleteSchema>>(
      async (os) => {
        return getInternalArtifactMock(os, 'v1', opts);
      }
    )
  );
};

export const getMockArtifactsWithDiff = async (opts?: { compress: boolean }) => {
  return Promise.all(
    ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS.map<Promise<InternalArtifactCompleteSchema>>(
      async (os) => {
        if (os === 'linux') {
          return getInternalArtifactMockWithDiffs(os, 'v1');
        }
        return getInternalArtifactMock(os, 'v1', opts);
      }
    )
  );
};

export const getEmptyMockArtifacts = async (opts?: { compress: boolean }) => {
  return Promise.all(
    ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS.map<Promise<InternalArtifactCompleteSchema>>(
      async (os) => {
        return getEmptyInternalArtifactMock(os, 'v1', opts);
      }
    )
  );
};

export const getMockManifest = async (opts?: { compress: boolean }) => {
  const manifest = new Manifest('v1');
  const artifacts = await getMockArtifacts(opts);
  artifacts.forEach((artifact) => manifest.addEntry(artifact));
  return manifest;
};

export const getMockManifestWithDiffs = async (opts?: { compress: boolean }) => {
  const manifest = new Manifest('v1');
  const artifacts = await getMockArtifactsWithDiff(opts);
  artifacts.forEach((artifact) => manifest.addEntry(artifact));
  return manifest;
};

export const getEmptyMockManifest = async (opts?: { compress: boolean }) => {
  const manifest = new Manifest('v1');
  const artifacts = await getEmptyMockArtifacts(opts);
  artifacts.forEach((artifact) => manifest.addEntry(artifact));
  return manifest;
};
