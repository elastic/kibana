/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { createNewPackagePolicyMock } from '../../../ingest_manager/common/mocks';
import { factory as policyConfigFactory } from '../../common/endpoint/models/policy_config';
import {
  getManifestManagerMock,
  ManifestManagerMockType,
} from './services/artifacts/manifest_manager/manifest_manager.mock';
import { getPackagePolicyCreateCallback } from './ingest_integration';

describe('ingest_integration tests ', () => {
  describe('ingest_integration sanity checks', () => {
    test('policy is updated with initial manifest', async () => {
      const logger = loggingSystemMock.create().get('ingest_integration.test');
      const manifestManager = getManifestManagerMock({
        mockType: ManifestManagerMockType.InitialSystemState,
      });

      const callback = getPackagePolicyCreateCallback(logger, manifestManager);
      const policyConfig = createNewPackagePolicyMock(); // policy config without manifest
      const newPolicyConfig = await callback(policyConfig); // policy config WITH manifest

      expect(newPolicyConfig.inputs[0]!.type).toEqual('endpoint');
      expect(newPolicyConfig.inputs[0]!.config!.policy.value).toEqual(policyConfigFactory());
      expect(newPolicyConfig.inputs[0]!.config!.artifact_manifest.value).toEqual({
        artifacts: {
          'endpoint-exceptionlist-macos-v1': {
            compression_algorithm: 'zlib',
            decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            decoded_size: 14,
            encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
            encoded_size: 22,
            encryption_algorithm: 'none',
            relative_url:
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
          },
          'endpoint-exceptionlist-windows-v1': {
            compression_algorithm: 'zlib',
            decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            decoded_size: 14,
            encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
            encoded_size: 22,
            encryption_algorithm: 'none',
            relative_url:
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
          },
        },
        manifest_version: '1.0.0',
        schema_version: 'v1',
      });
    });

    test('policy is returned even if error is encountered during artifact creation', async () => {
      const logger = loggingSystemMock.create().get('ingest_integration.test');
      const manifestManager = getManifestManagerMock();
      manifestManager.pushArtifacts = jest.fn().mockResolvedValue([new Error('error updating')]);
      const lastComputed = await manifestManager.getLastComputedManifest();

      const callback = getPackagePolicyCreateCallback(logger, manifestManager);
      const policyConfig = createNewPackagePolicyMock();
      const newPolicyConfig = await callback(policyConfig);

      expect(newPolicyConfig.inputs[0]!.type).toEqual('endpoint');
      expect(newPolicyConfig.inputs[0]!.config!.policy.value).toEqual(policyConfigFactory());
      expect(newPolicyConfig.inputs[0]!.config!.artifact_manifest.value).toEqual(
        lastComputed!.toEndpointFormat()
      );
    });

    test('initial policy creation succeeds if manifest retrieval fails', async () => {
      const logger = loggingSystemMock.create().get('ingest_integration.test');
      const manifestManager = getManifestManagerMock({
        mockType: ManifestManagerMockType.InitialSystemState,
      });
      const lastComputed = await manifestManager.getLastComputedManifest();
      expect(lastComputed).toEqual(null);

      manifestManager.buildNewManifest = jest.fn().mockRejectedValue(new Error('abcd'));
      const callback = getPackagePolicyCreateCallback(logger, manifestManager);
      const policyConfig = createNewPackagePolicyMock();
      const newPolicyConfig = await callback(policyConfig);

      expect(newPolicyConfig.inputs[0]!.type).toEqual('endpoint');
      expect(newPolicyConfig.inputs[0]!.config!.policy.value).toEqual(policyConfigFactory());
    });

    test('subsequent policy creations succeed', async () => {
      const logger = loggingSystemMock.create().get('ingest_integration.test');
      const manifestManager = getManifestManagerMock();
      const lastComputed = await manifestManager.getLastComputedManifest();

      manifestManager.buildNewManifest = jest.fn().mockResolvedValue(lastComputed); // no diffs
      const callback = getPackagePolicyCreateCallback(logger, manifestManager);
      const policyConfig = createNewPackagePolicyMock();
      const newPolicyConfig = await callback(policyConfig);

      expect(newPolicyConfig.inputs[0]!.type).toEqual('endpoint');
      expect(newPolicyConfig.inputs[0]!.config!.policy.value).toEqual(policyConfigFactory());
      expect(newPolicyConfig.inputs[0]!.config!.artifact_manifest.value).toEqual(
        lastComputed!.toEndpointFormat()
      );
    });
  });
});
