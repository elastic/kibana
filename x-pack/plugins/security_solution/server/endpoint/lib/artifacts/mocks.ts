/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PackageConfig } from '../../../../../ingest_manager/common';
import { createPackageConfigMock } from '../../../../../ingest_manager/common/mocks';
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

export const createPackageConfigWithInitialManifestMock = (): PackageConfig => {
  const packageConfig = createPackageConfigMock();
  packageConfig.inputs[0].config!.artifact_manifest = {
    value: {
      artifacts: {
        'endpoint-exceptionlist-linux-v1': {
          compression_algorithm: 'zlib',
          encryption_algorithm: 'none',
          decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
          encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
          decoded_size: 14,
          encoded_size: 22,
          relative_url:
            '/api/endpoint/artifacts/download/endpoint-exceptionlist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
        },
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
      manifest_version: 'a9b7ef358a363f327f479e31efc4f228b2277a7fb4d1914ca9b4e7ca9ffcf537',
      schema_version: 'v1',
    },
  };
  return packageConfig;
};

export const createPackageConfigWithManifestMock = (): PackageConfig => {
  const packageConfig = createPackageConfigMock();
  packageConfig.inputs[0].config!.artifact_manifest = {
    value: {
      artifacts: {
        'endpoint-exceptionlist-linux-v1': {
          compression_algorithm: 'zlib',
          encryption_algorithm: 'none',
          decoded_sha256: '0a5a2013a79f9e60682472284a1be45ab1ff68b9b43426d00d665016612c15c8',
          encoded_sha256: '57941169bb2c5416f9bd7224776c8462cb9a2be0fe8b87e6213e77a1d29be824',
          decoded_size: 292,
          encoded_size: 131,
          relative_url:
            '/api/endpoint/artifacts/download/endpoint-exceptionlist-linux-v1/0a5a2013a79f9e60682472284a1be45ab1ff68b9b43426d00d665016612c15c8',
        },
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
      manifest_version: '520f6cf88b3f36a065c6ca81058d5f8690aadadf6fe857f8dec4cc37589e7283',
      schema_version: 'v1',
    },
  };

  return packageConfig;
};
