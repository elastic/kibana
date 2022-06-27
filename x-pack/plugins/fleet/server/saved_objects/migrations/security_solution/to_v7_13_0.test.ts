/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { cloneDeepWith, cloneDeep } from 'lodash';

import { migrationMocks } from '@kbn/core/server/mocks';

import type { PackagePolicy } from '../../../../common';

import { migrateEndpointPackagePolicyToV7130 } from './to_v7_13_0';

describe('7.13.0 Endpoint Package Policy migration', () => {
  const createOldPackagePolicySO = (): SavedObjectUnsanitizedDoc<PackagePolicy> => {
    return {
      id: 'mock-saved-object-id',
      attributes: {
        name: 'Some Policy Name',
        package: {
          name: 'endpoint',
          title: '',
          version: '',
        },
        id: 'mock-saved-object-id',
        policy_id: '',
        enabled: true,
        namespace: '',
        output_id: '',
        revision: 0,
        updated_at: '',
        updated_by: '',
        created_at: '',
        created_by: '',
        inputs: [
          {
            type: 'endpoint',
            enabled: true,
            streams: [],
            config: {
              artifact_manifest: {
                value: {
                  manifest_version: '1.0.0',
                  schema_version: 'v1',
                  artifacts: {
                    'endpoint-exceptionlist-macos-v1': {
                      encryption_algorithm: 'none',
                      decoded_sha256:
                        'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      decoded_size: 14,
                      encoded_sha256:
                        'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                      encoded_size: 22,
                      relative_url:
                        '/api/endpoint/artifacts/download/endpoint-exceptionlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      compression_algorithm: 'zlib',
                    },
                    'endpoint-exceptionlist-windows-v1': {
                      encryption_algorithm: 'none',
                      decoded_sha256:
                        'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      decoded_size: 14,
                      encoded_sha256:
                        'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                      encoded_size: 22,
                      relative_url:
                        '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      compression_algorithm: 'zlib',
                    },
                    'endpoint-trustlist-macos-v1': {
                      encryption_algorithm: 'none',
                      decoded_sha256:
                        'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      decoded_size: 14,
                      encoded_sha256:
                        'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                      encoded_size: 22,
                      relative_url:
                        '/api/endpoint/artifacts/download/endpoint-trustlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      compression_algorithm: 'zlib',
                    },
                    'endpoint-trustlist-windows-v1': {
                      encryption_algorithm: 'none',
                      decoded_sha256:
                        'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      decoded_size: 14,
                      encoded_sha256:
                        'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                      encoded_size: 22,
                      relative_url:
                        '/api/endpoint/artifacts/download/endpoint-trustlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      compression_algorithm: 'zlib',
                    },
                    'endpoint-trustlist-linux-v1': {
                      encryption_algorithm: 'none',
                      decoded_sha256:
                        'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      decoded_size: 14,
                      encoded_sha256:
                        'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                      encoded_size: 22,
                      relative_url:
                        '/api/endpoint/artifacts/download/endpoint-trustlist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                      compression_algorithm: 'zlib',
                    },
                  },
                },
              },
            },
          },
        ],
      },
      type: ' nested',
    };
  };
  const createNewPackagePolicySO = (): SavedObjectUnsanitizedDoc<PackagePolicy> => {
    return cloneDeepWith(createOldPackagePolicySO(), (value, key) => {
      if (key === 'relative_url') {
        return value.replace('/api/endpoint/artifacts/download/', '/api/fleet/artifacts/');
      }
    });
  };

  const migrationContext = migrationMocks.createContext();

  it('should adjust the relative url for all artifact manifests', () => {
    expect(
      migrateEndpointPackagePolicyToV7130(createOldPackagePolicySO(), migrationContext)
    ).toEqual(createNewPackagePolicySO());
  });

  it('should NOT touch non-endpoint package policies', () => {
    const packagePolicySo = createOldPackagePolicySO();
    packagePolicySo.attributes.package!.name = 'not endpoint';

    const unchangedPackagePolicySo = cloneDeep(packagePolicySo);

    expect(migrateEndpointPackagePolicyToV7130(packagePolicySo, migrationContext)).toEqual(
      unchangedPackagePolicySo
    );
  });
});
