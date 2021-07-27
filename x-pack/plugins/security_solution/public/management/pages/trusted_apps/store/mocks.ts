/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProtectionModes } from '../../../../../common/endpoint/types';
import { GetPolicyListResponse } from '../../policy/types';

export const getPolicyResponse = (): GetPolicyListResponse => ({
  items: [
    {
      id: '6c8b0e2f-033e-40d5-8903-7cf3cb16966d',
      version: 'WzEzNDQ0NSw0XQ==',
      name: 'Ransomware protection',
      description: '',
      namespace: 'default',
      policy_id: '9fd2ac50-e86f-11eb-a87f-51e16104076a',
      enabled: true,
      output_id: '',
      inputs: [
        {
          streams: [],
          type: 'endpoint',
          config: {
            artifact_manifest: {
              value: {
                schema_version: 'v1',
                manifest_version: '1.0.45',
                artifacts: {
                  'endpoint-trustlist-windows-v1': {
                    relative_url:
                      '/api/fleet/artifacts/endpoint-trustlist-windows-v1/034079d4153038bc35fed4c5a95e1f19b8d04b5b05bbffabc1662219059e84bd',
                    compression_algorithm: 'zlib',
                    decoded_size: 270,
                    decoded_sha256:
                      '034079d4153038bc35fed4c5a95e1f19b8d04b5b05bbffabc1662219059e84bd',
                    encryption_algorithm: 'none',
                    encoded_sha256:
                      '38f378e57ac9a7153da35c991d1945178d8ae4644dc0109e0f0ca96a6194a52e',
                    encoded_size: 124,
                  },
                  'endpoint-eventfilterlist-windows-v1': {
                    relative_url:
                      '/api/fleet/artifacts/endpoint-eventfilterlist-windows-v1/1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
                    compression_algorithm: 'zlib',
                    decoded_size: 287,
                    decoded_sha256:
                      '1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
                    encryption_algorithm: 'none',
                    encoded_sha256:
                      'c3dec543df1177561ab2aa74a37997ea3c1d748d532a597884f5a5c16670d56c',
                    encoded_size: 133,
                  },
                  'endpoint-exceptionlist-linux-v1': {
                    relative_url:
                      '/api/fleet/artifacts/endpoint-exceptionlist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                    compression_algorithm: 'zlib',
                    decoded_size: 14,
                    decoded_sha256:
                      'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                    encryption_algorithm: 'none',
                    encoded_sha256:
                      'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                    encoded_size: 22,
                  },
                  'endpoint-trustlist-macos-v1': {
                    relative_url:
                      '/api/fleet/artifacts/endpoint-trustlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                    compression_algorithm: 'zlib',
                    decoded_size: 14,
                    decoded_sha256:
                      'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                    encryption_algorithm: 'none',
                    encoded_sha256:
                      'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                    encoded_size: 22,
                  },
                  'endpoint-exceptionlist-macos-v1': {
                    relative_url:
                      '/api/fleet/artifacts/endpoint-exceptionlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                    compression_algorithm: 'zlib',
                    decoded_size: 14,
                    decoded_sha256:
                      'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                    encryption_algorithm: 'none',
                    encoded_sha256:
                      'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                    encoded_size: 22,
                  },
                  'endpoint-trustlist-linux-v1': {
                    relative_url:
                      '/api/fleet/artifacts/endpoint-trustlist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                    compression_algorithm: 'zlib',
                    decoded_size: 14,
                    decoded_sha256:
                      'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                    encryption_algorithm: 'none',
                    encoded_sha256:
                      'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                    encoded_size: 22,
                  },
                  'endpoint-eventfilterlist-linux-v1': {
                    relative_url:
                      '/api/fleet/artifacts/endpoint-eventfilterlist-linux-v1/1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
                    compression_algorithm: 'zlib',
                    decoded_size: 287,
                    decoded_sha256:
                      '1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
                    encryption_algorithm: 'none',
                    encoded_sha256:
                      'c3dec543df1177561ab2aa74a37997ea3c1d748d532a597884f5a5c16670d56c',
                    encoded_size: 133,
                  },
                  'endpoint-exceptionlist-windows-v1': {
                    relative_url:
                      '/api/fleet/artifacts/endpoint-exceptionlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                    compression_algorithm: 'zlib',
                    decoded_size: 14,
                    decoded_sha256:
                      'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                    encryption_algorithm: 'none',
                    encoded_sha256:
                      'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
                    encoded_size: 22,
                  },
                  'endpoint-eventfilterlist-macos-v1': {
                    relative_url:
                      '/api/fleet/artifacts/endpoint-eventfilterlist-macos-v1/1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
                    compression_algorithm: 'zlib',
                    decoded_size: 287,
                    decoded_sha256:
                      '1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
                    encryption_algorithm: 'none',
                    encoded_sha256:
                      'c3dec543df1177561ab2aa74a37997ea3c1d748d532a597884f5a5c16670d56c',
                    encoded_size: 133,
                  },
                },
              },
            },
            policy: {
              value: {
                linux: {
                  popup: { malware: { message: '', enabled: true } },
                  malware: { mode: ProtectionModes.prevent },
                  logging: { file: 'info' },
                  events: { process: true, file: true, network: true },
                },
                windows: {
                  popup: {
                    malware: { message: '', enabled: true },
                    ransomware: { message: '', enabled: true },
                    memory_protection: { message: '', enabled: true },
                  },
                  malware: { mode: ProtectionModes.prevent },
                  logging: { file: 'info' },
                  antivirus_registration: { enabled: false },
                  events: {
                    registry: true,
                    process: true,
                    security: true,
                    file: true,
                    dns: true,
                    dll_and_driver_load: true,
                    network: true,
                  },
                  ransomware: { mode: ProtectionModes.prevent, supported: true },
                  memory_protection: { mode: ProtectionModes.prevent, supported: true },
                },
                mac: {
                  popup: { malware: { message: '', enabled: true } },
                  malware: { mode: ProtectionModes.prevent },
                  logging: { file: 'info' },
                  events: { process: true, file: true, network: true },
                },
              },
            },
          },
          enabled: true,
        },
      ],
      package: { name: 'endpoint', title: 'Endpoint Security', version: '0.20.2' },
      revision: 3,
      created_at: '2021-07-21T10:34:46.894Z',
      created_by: 'elastic',
      updated_at: '2021-07-21T10:53:25.330Z',
      updated_by: 'system',
    },
  ],
  total: 6,
  page: 1,
  perPage: 1000,
});
