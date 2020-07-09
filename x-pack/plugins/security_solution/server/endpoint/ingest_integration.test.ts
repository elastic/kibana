/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { loggerMock } from 'src/core/server/logging/logger.mock';
import { createNewPackageConfigMock } from '../../../ingest_manager/common/mocks';
import { factory as policyConfigFactory } from '../../common/endpoint/models/policy_config';
import { getManifestManagerMock } from './services/artifacts/manifest_manager/manifest_manager.mock';
import { getPackageConfigCreateCallback } from './ingest_integration';

describe('ingest_integration tests ', () => {
  describe('ingest_integration sanity checks', () => {
    test('policy is updated with manifest', async () => {
      const logger = loggerMock.create();
      const manifestManager = getManifestManagerMock();
      const callback = getPackageConfigCreateCallback(logger, manifestManager);
      const policyConfig = createNewPackageConfigMock();
      const newPolicyConfig = await callback(policyConfig);
      expect(newPolicyConfig.inputs[0]!.type).toEqual('endpoint');
      expect(newPolicyConfig.inputs[0]!.config!.policy.value).toEqual(policyConfigFactory());
      expect(newPolicyConfig.inputs[0]!.config!.artifact_manifest.value).toEqual({
        artifacts: {
          'endpoint-exceptionlist-linux-v1': {
            compression_algorithm: 'zlib',
            decoded_sha256: '1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
            decoded_size: 287,
            encoded_sha256: 'c3dec543df1177561ab2aa74a37997ea3c1d748d532a597884f5a5c16670d56c',
            encoded_size: 133,
            encryption_algorithm: 'none',
            relative_url:
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-linux-v1/1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
          },
        },
        manifest_version: 'WzAsMF0=',
        schema_version: 'v1',
      });
    });

    test('policy is returned even if error is encountered during artifact sync', async () => {
      const logger = loggerMock.create();
      const manifestManager = getManifestManagerMock();
      manifestManager.syncArtifacts = jest.fn().mockRejectedValue([new Error('error updating')]);
      const lastDispatched = await manifestManager.getLastDispatchedManifest();
      const callback = getPackageConfigCreateCallback(logger, manifestManager);
      const policyConfig = createNewPackageConfigMock();
      const newPolicyConfig = await callback(policyConfig);
      expect(newPolicyConfig.inputs[0]!.type).toEqual('endpoint');
      expect(newPolicyConfig.inputs[0]!.config!.policy.value).toEqual(policyConfigFactory());
      expect(newPolicyConfig.inputs[0]!.config!.artifact_manifest.value).toEqual(
        lastDispatched.toEndpointFormat()
      );
    });

    test('initial policy creation succeeds if snapshot retrieval fails', async () => {
      const logger = loggerMock.create();
      const manifestManager = getManifestManagerMock();
      const lastDispatched = await manifestManager.getLastDispatchedManifest();
      manifestManager.getSnapshot = jest.fn().mockResolvedValue(null);
      const callback = getPackageConfigCreateCallback(logger, manifestManager);
      const policyConfig = createNewPackageConfigMock();
      const newPolicyConfig = await callback(policyConfig);
      expect(newPolicyConfig.inputs[0]!.type).toEqual('endpoint');
      expect(newPolicyConfig.inputs[0]!.config!.policy.value).toEqual(policyConfigFactory());
      expect(newPolicyConfig.inputs[0]!.config!.artifact_manifest.value).toEqual(
        lastDispatched.toEndpointFormat()
      );
    });

    test('subsequent policy creations succeed', async () => {
      const logger = loggerMock.create();
      const manifestManager = getManifestManagerMock();
      const snapshot = await manifestManager.getSnapshot();
      manifestManager.getLastDispatchedManifest = jest.fn().mockResolvedValue(snapshot!.manifest);
      manifestManager.getSnapshot = jest.fn().mockResolvedValue({
        manifest: snapshot!.manifest,
        diffs: [],
      });
      const callback = getPackageConfigCreateCallback(logger, manifestManager);
      const policyConfig = createNewPackageConfigMock();
      const newPolicyConfig = await callback(policyConfig);
      expect(newPolicyConfig.inputs[0]!.type).toEqual('endpoint');
      expect(newPolicyConfig.inputs[0]!.config!.policy.value).toEqual(policyConfigFactory());
      expect(newPolicyConfig.inputs[0]!.config!.artifact_manifest.value).toEqual(
        snapshot!.manifest.toEndpointFormat()
      );
    });
  });
});
