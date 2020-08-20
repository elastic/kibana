/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PackagePolicy } from '../../../../../ingest_manager/common';
import { createPackagePolicyMock } from '../../../../../ingest_manager/common/mocks';
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
        if (os === 'macos') {
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
  const manifest = new Manifest();
  const artifacts = await getMockArtifacts(opts);
  artifacts.forEach((artifact) => manifest.addEntry(artifact));
  return manifest;
};

export const getMockManifestWithDiffs = async (opts?: { compress: boolean }) => {
  const manifest = new Manifest();
  const artifacts = await getMockArtifactsWithDiff(opts);
  artifacts.forEach((artifact) => manifest.addEntry(artifact));
  return manifest;
};

export const getEmptyMockManifest = async (opts?: { compress: boolean }) => {
  const manifest = new Manifest();
  const artifacts = await getEmptyMockArtifacts(opts);
  artifacts.forEach((artifact) => manifest.addEntry(artifact));
  return manifest;
};

export const createPackagePolicyWithInitialManifestMock = (): PackagePolicy => {
  const packagePolicy = createPackagePolicyMock();
  packagePolicy.inputs[0].config!.artifact_manifest = {
    value: {
      artifacts: {
        'endpoint-exceptionlist-macos-v1': {
          compression_algorithm: 'zlib',
          encryption_algorithm: 'none',
          decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
          encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
          decoded_size: 14,
          encoded_size: 22,
          relative_url:
            '/api/endpoint/artifacts/download/endpoint-exceptionlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
        },
        'endpoint-exceptionlist-windows-v1': {
          compression_algorithm: 'zlib',
          encryption_algorithm: 'none',
          decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
          encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
          decoded_size: 14,
          encoded_size: 22,
          relative_url:
            '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
        },
      },
      manifest_version: '1.0.0',
      schema_version: 'v1',
    },
  };
  return packagePolicy;
};

export const createPackagePolicyWithManifestMock = (): PackagePolicy => {
  const packagePolicy = createPackagePolicyMock();
  packagePolicy.inputs[0].config!.artifact_manifest = {
    value: {
      artifacts: {
        'endpoint-exceptionlist-macos-v1': {
          compression_algorithm: 'zlib',
          encryption_algorithm: 'none',
          decoded_sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          encoded_sha256: '975382ab55d019cbab0bbac207a54e2a7d489fad6e8f6de34fc6402e5ef37b1e',
          decoded_size: 432,
          encoded_size: 147,
          relative_url:
            '/api/endpoint/artifacts/download/endpoint-exceptionlist-macos-v1/96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
        },
        'endpoint-exceptionlist-windows-v1': {
          compression_algorithm: 'zlib',
          encryption_algorithm: 'none',
          decoded_sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          encoded_sha256: '975382ab55d019cbab0bbac207a54e2a7d489fad6e8f6de34fc6402e5ef37b1e',
          decoded_size: 432,
          encoded_size: 147,
          relative_url:
            '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
        },
      },
      manifest_version: '1.0.1',
      schema_version: 'v1',
    },
  };

  return packagePolicy;
};
