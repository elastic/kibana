/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ArtifactSourceMap,
  getPackagePolicyWithSourceMap,
  getCleanedBundleFilePath,
} from './source_maps';

const packagePolicy = {
  id: '123',
  version: 'WzMxNDI2LDFd',
  name: 'apm-1',
  description: '',
  namespace: 'default',
  policy_id: '7a87c160-c961-11eb-81e2-f7327d61c92a',
  enabled: true,
  output_id: '',
  inputs: [
    {
      policy_template: 'apmserver',
      streams: [],
      vars: {},
      type: 'apm',
      enabled: true,
      compiled_input: {
        'apm-server': {
          capture_personal_data: true,
          max_event_size: 307200,
          api_key: { limit: 100, enabled: false },
          default_service_environment: null,
          host: 'localhost:8200',
          kibana: { api_key: null },
          secret_token: null,
        },
      },
    },
  ],
  package: { name: 'apm', title: 'Elastic APM', version: '0.2.0' },
  created_at: '2021-06-16T14:54:32.195Z',
  created_by: 'elastic',
};

const artifacts = [
  {
    type: 'sourcemap',
    identifier: 'service_name-1.0.0',
    relative_url: '/api/fleet/artifacts/service_name-1.0.0/my-id-1',
    body: {
      serviceName: 'service_name',
      serviceVersion: '1.0.0',
      bundleFilepath: 'http://localhost:3000/static/js/main.chunk.js',
      sourceMap: {
        version: 3,
        file: 'static/js/main.chunk.js',
        sources: ['foo'],
        sourcesContent: ['foo'],
        mappings: 'foo',
        sourceRoot: '',
      },
    },
    created: '2021-06-16T15:03:55.049Z',
    id: 'apm:service_name-1.0.0-my-id-1',
    compressionAlgorithm: 'zlib',
    decodedSha256: 'my-id-1',
    decodedSize: 9440,
    encodedSha256: 'sha123',
    encodedSize: 2622,
    encryptionAlgorithm: 'none',
    packageName: 'apm',
  },
  {
    type: 'sourcemap',
    identifier: 'service_name-2.0.0',
    relative_url: '/api/fleet/artifacts/service_name-2.0.0/my-id-2',
    body: {
      serviceName: 'service_name',
      serviceVersion: '2.0.0',
      bundleFilepath: 'http://localhost:3000/static/js/main.chunk.js',
      sourceMap: {
        version: 3,
        file: 'static/js/main.chunk.js',
        sources: ['foo'],
        sourcesContent: ['foo'],
        mappings: 'foo',
        sourceRoot: '',
      },
    },
    created: '2021-06-16T15:03:55.049Z',
    id: 'apm:service_name-2.0.0-my-id-2',
    compressionAlgorithm: 'zlib',
    decodedSha256: 'my-id-2',
    decodedSize: 9440,
    encodedSha256: 'sha456',
    encodedSize: 2622,
    encryptionAlgorithm: 'none',
    packageName: 'apm',
  },
] as ArtifactSourceMap[];

describe('Source maps', () => {
  describe('getPackagePolicyWithSourceMap', () => {
    it('removes source map from package policy', () => {
      const packagePolicyWithSourceMaps = {
        ...packagePolicy,
        inputs: [
          {
            ...packagePolicy.inputs[0],
            compiled_input: {
              'apm-server': {
                ...packagePolicy.inputs[0].compiled_input['apm-server'],
                value: {
                  rum: {
                    source_mapping: {
                      metadata: [
                        {
                          'service.name': 'service_name',
                          'service.version': '1.0.0',
                          'bundle.filepath':
                            'http://localhost:3000/static/js/main.chunk.js',
                          'sourcemap.url':
                            '/api/fleet/artifacts/service_name-1.0.0/my-id-1',
                        },
                        {
                          'service.name': 'service_name',
                          'service.version': '2.0.0',
                          'bundle.filepath':
                            'http://localhost:3000/static/js/main.chunk.js',
                          'sourcemap.url':
                            '/api/fleet/artifacts/service_name-2.0.0/my-id-2',
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        ],
      };
      const updatedPackagePolicy = getPackagePolicyWithSourceMap({
        packagePolicy: packagePolicyWithSourceMaps,
        artifacts: [],
      });
      expect(updatedPackagePolicy.inputs[0].config).toEqual({
        'apm-server': { value: { rum: { source_mapping: { metadata: [] } } } },
      });
    });
    it('adds source maps into the package policy', () => {
      const updatedPackagePolicy = getPackagePolicyWithSourceMap({
        packagePolicy,
        artifacts,
      });
      expect(updatedPackagePolicy.inputs[0].config).toEqual({
        'apm-server': {
          value: {
            rum: {
              source_mapping: {
                metadata: [
                  {
                    'service.name': 'service_name',
                    'service.version': '1.0.0',
                    'bundle.filepath':
                      'http://localhost:3000/static/js/main.chunk.js',
                    'sourcemap.url':
                      '/api/fleet/artifacts/service_name-1.0.0/my-id-1',
                  },
                  {
                    'service.name': 'service_name',
                    'service.version': '2.0.0',
                    'bundle.filepath':
                      'http://localhost:3000/static/js/main.chunk.js',
                    'sourcemap.url':
                      '/api/fleet/artifacts/service_name-2.0.0/my-id-2',
                  },
                ],
              },
            },
          },
        },
      });
    });
  });
  describe('getCleanedBundleFilePath', () => {
    it('cleans url', () => {
      expect(
        getCleanedBundleFilePath(
          'http://localhost:8000/test/e2e/../e2e/general-usecase/bundle.js.map'
        )
      ).toEqual('http://localhost:8000/test/e2e/general-usecase/bundle.js.map');
    });

    it('returns same path when it is not a valid url', () => {
      expect(
        getCleanedBundleFilePath('/general-usecase/bundle.js.map')
      ).toEqual('/general-usecase/bundle.js.map');
    });
  });
});
