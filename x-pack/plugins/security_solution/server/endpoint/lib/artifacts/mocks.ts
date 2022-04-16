/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { PackagePolicy, PackagePolicyConfigRecord } from '@kbn/fleet-plugin/common';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { InternalArtifactCompleteSchema } from '../../schemas/artifacts';
import {
  getInternalArtifactMock,
  getInternalArtifactMockWithDiffs,
  getEmptyInternalArtifactMock,
} from '../../schemas/artifacts/saved_objects.mock';
import { ArtifactConstants } from './common';
import { Manifest } from './manifest';

export const getMockArtifacts = async () => {
  return Promise.all([
    // Exceptions items
    ...ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS.map<Promise<InternalArtifactCompleteSchema>>(
      async (os) => {
        return getInternalArtifactMock(os, 'v1');
      }
    ),
    // Trusted Apps items
    ...ArtifactConstants.SUPPORTED_TRUSTED_APPS_OPERATING_SYSTEMS.map<
      Promise<InternalArtifactCompleteSchema>
    >(async (os) => {
      return getInternalArtifactMock(os, 'v1', ArtifactConstants.GLOBAL_TRUSTED_APPS_NAME);
    }),
  ]);
};

export const getMockArtifactsWithDiff = async () => {
  return Promise.all(
    ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS.map<Promise<InternalArtifactCompleteSchema>>(
      async (os) => {
        if (os === 'macos') {
          return getInternalArtifactMockWithDiffs(os, 'v1');
        }
        return getInternalArtifactMock(os, 'v1');
      }
    )
  );
};

export const getEmptyMockArtifacts = async () => {
  return Promise.all(
    ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS.map<Promise<InternalArtifactCompleteSchema>>(
      async (os) => {
        return getEmptyInternalArtifactMock(os, 'v1');
      }
    )
  );
};

export const getMockManifest = async () => {
  const manifest = new Manifest();
  const artifacts = await getMockArtifacts();
  artifacts.forEach((artifact) => manifest.addEntry(artifact));
  return manifest;
};

const toArtifactRecord = (artifactName: string, artifact: InternalArtifactCompleteSchema) => ({
  compression_algorithm: artifact.compressionAlgorithm,
  decoded_sha256: artifact.decodedSha256,
  decoded_size: artifact.decodedSize,
  encoded_sha256: artifact.encodedSha256,
  encoded_size: artifact.encodedSize,
  encryption_algorithm: artifact.encryptionAlgorithm,
  relative_url: `/api/fleet/artifacts/${artifactName}/${artifact.decodedSha256}`,
});

export const toArtifactRecords = (artifacts: Record<string, InternalArtifactCompleteSchema>) =>
  mapValues(artifacts, (artifact, key) => toArtifactRecord(key, artifact));

export const createPackagePolicyWithConfigMock = (
  options: Partial<PackagePolicy> & { config?: PackagePolicyConfigRecord }
): PackagePolicy => {
  const { config, ...packagePolicyOverrides } = options;
  const packagePolicy = createPackagePolicyMock();
  packagePolicy.inputs[0].config = options.config;
  return { ...packagePolicy, ...packagePolicyOverrides };
};

export const createPackagePolicyWithInitialManifestMock = (): PackagePolicy => {
  return createPackagePolicyWithConfigMock({
    config: {
      artifact_manifest: {
        value: {
          artifacts: {
            'endpoint-eventfilterlist-linux-v1': {
              compression_algorithm: 'zlib',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              decoded_size: 14,
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              encoded_size: 22,
              encryption_algorithm: 'none',
              relative_url:
                '/api/fleet/artifacts/endpoint-eventfilterlist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
            'endpoint-eventfilterlist-macos-v1': {
              compression_algorithm: 'zlib',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              decoded_size: 14,
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              encoded_size: 22,
              encryption_algorithm: 'none',
              relative_url:
                '/api/fleet/artifacts/endpoint-eventfilterlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
            'endpoint-eventfilterlist-windows-v1': {
              compression_algorithm: 'zlib',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              decoded_size: 14,
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              encoded_size: 22,
              encryption_algorithm: 'none',
              relative_url:
                '/api/fleet/artifacts/endpoint-eventfilterlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
            'endpoint-exceptionlist-macos-v1': {
              compression_algorithm: 'zlib',
              encryption_algorithm: 'none',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              decoded_size: 14,
              encoded_size: 22,
              relative_url:
                '/api/fleet/artifacts/endpoint-exceptionlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
            'endpoint-exceptionlist-windows-v1': {
              compression_algorithm: 'zlib',
              encryption_algorithm: 'none',
              decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
              encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
              decoded_size: 14,
              encoded_size: 22,
              relative_url:
                '/api/fleet/artifacts/endpoint-exceptionlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            },
          },
          manifest_version: '1.0.0',
          schema_version: 'v1',
        },
      },
    },
  });
};

export const createPackagePolicyWithManifestMock = (): PackagePolicy => {
  return createPackagePolicyWithConfigMock({
    config: {
      artifact_manifest: {
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
                '/api/fleet/artifacts/endpoint-exceptionlist-macos-v1/96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
            },
            'endpoint-exceptionlist-windows-v1': {
              compression_algorithm: 'zlib',
              encryption_algorithm: 'none',
              decoded_sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
              encoded_sha256: '975382ab55d019cbab0bbac207a54e2a7d489fad6e8f6de34fc6402e5ef37b1e',
              decoded_size: 432,
              encoded_size: 147,
              relative_url:
                '/api/fleet/artifacts/endpoint-exceptionlist-windows-v1/96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
            },
          },
          manifest_version: '1.0.1',
          schema_version: 'v1',
        },
      },
    },
  });
};
