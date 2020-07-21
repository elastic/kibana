/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NewPackageConfig, PackageConfig } from './types/models/package_config';

export const createNewPackageConfigMock = (): NewPackageConfig => {
  return {
    name: 'endpoint-1',
    description: '',
    namespace: 'default',
    enabled: true,
    config_id: '93c46720-c217-11ea-9906-b5b8a21b268e',
    output_id: '',
    package: {
      name: 'endpoint',
      title: 'Elastic Endpoint',
      version: '0.9.0',
    },
    inputs: [],
  };
};

export const createPackageConfigMock = (): PackageConfig => {
  const newPackageConfig = createNewPackageConfigMock();
  return {
    ...newPackageConfig,
    id: 'c6d16e42-c32d-4dce-8a88-113cfe276ad1',
    version: 'abcd',
    revision: 1,
    updated_at: '2020-06-25T16:03:38.159292',
    updated_by: 'kibana',
    created_at: '2020-06-25T16:03:38.159292',
    created_by: 'kibana',
    inputs: [
      {
        config: {},
        enabled: true,
        type: 'endpoint',
        streams: [],
      },
    ],
  };
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
