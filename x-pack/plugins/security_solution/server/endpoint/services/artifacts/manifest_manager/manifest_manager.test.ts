/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { inflateSync } from 'zlib';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { createPackagePolicyServiceMock } from '../../../../../../ingest_manager/server/mocks';
import { ArtifactConstants, ManifestConstants, isCompleteArtifact } from '../../../lib/artifacts';

import { getManifestManagerMock, ManifestManagerMockType } from './manifest_manager.mock';
import LRU from 'lru-cache';

describe('manifest_manager', () => {
  describe('ManifestManager sanity checks', () => {
    test('ManifestManager can retrieve and diff manifests', async () => {
      const manifestManager = getManifestManagerMock();
      const oldManifest = await manifestManager.getLastComputedManifest();
      const newManifest = await manifestManager.buildNewManifest(oldManifest!);
      expect(newManifest.diff(oldManifest!)).toEqual([
        {
          id:
            'endpoint-exceptionlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          type: 'delete',
        },
        {
          id:
            'endpoint-exceptionlist-macos-v1-0a5a2013a79f9e60682472284a1be45ab1ff68b9b43426d00d665016612c15c8',
          type: 'add',
        },
      ]);
    });

    test('ManifestManager populates cache properly', async () => {
      const cache = new LRU<string, Buffer>({ max: 10, maxAge: 1000 * 60 * 60 });
      const manifestManager = getManifestManagerMock({ cache });
      const oldManifest = await manifestManager.getLastComputedManifest();
      const newManifest = await manifestManager.buildNewManifest(oldManifest!);
      const diffs = newManifest.diff(oldManifest!);
      expect(diffs).toEqual([
        {
          id:
            'endpoint-exceptionlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          type: 'delete',
        },
        {
          id:
            'endpoint-exceptionlist-macos-v1-0a5a2013a79f9e60682472284a1be45ab1ff68b9b43426d00d665016612c15c8',
          type: 'add',
        },
      ]);

      const newArtifactId = diffs[1].id;
      await newManifest.compressArtifact(newArtifactId);
      const artifact = newManifest.getArtifact(newArtifactId)!;

      if (isCompleteArtifact(artifact)) {
        await manifestManager.pushArtifacts([artifact]); // caches the artifact
      } else {
        throw new Error('Artifact is missing a body.');
      }

      const entry = JSON.parse(inflateSync(cache.get(newArtifactId)! as Buffer).toString());
      expect(entry).toEqual({
        entries: [
          {
            type: 'simple',
            entries: [
              {
                entries: [
                  {
                    field: 'some.nested.field',
                    operator: 'included',
                    type: 'exact_cased',
                    value: 'some value',
                  },
                ],
                field: 'some.parentField',
                type: 'nested',
              },
              {
                field: 'some.not.nested.field',
                operator: 'included',
                type: 'exact_cased',
                value: 'some value',
              },
            ],
          },
        ],
      });
    });

    test('ManifestManager cannot dispatch incomplete (uncompressed) artifact', async () => {
      const packagePolicyService = createPackagePolicyServiceMock();
      const manifestManager = getManifestManagerMock({ packagePolicyService });
      const oldManifest = await manifestManager.getLastComputedManifest();
      const newManifest = await manifestManager.buildNewManifest(oldManifest!);
      const dispatchErrors = await manifestManager.tryDispatch(newManifest);
      expect(dispatchErrors.length).toEqual(1);
      expect(dispatchErrors[0].message).toEqual('Invalid manifest');
    });

    test('ManifestManager can dispatch manifest', async () => {
      const packagePolicyService = createPackagePolicyServiceMock();
      const manifestManager = getManifestManagerMock({ packagePolicyService });
      const oldManifest = await manifestManager.getLastComputedManifest();
      const newManifest = await manifestManager.buildNewManifest(oldManifest!);
      const diffs = newManifest.diff(oldManifest!);
      const newArtifactId = diffs[1].id;
      await newManifest.compressArtifact(newArtifactId);

      newManifest.bumpSemanticVersion();

      const dispatchErrors = await manifestManager.tryDispatch(newManifest);

      expect(dispatchErrors).toEqual([]);

      // 2 policies updated... 1 is already up-to-date
      expect(packagePolicyService.update.mock.calls.length).toEqual(2);

      expect(
        packagePolicyService.update.mock.calls[0][2].inputs[0].config!.artifact_manifest.value
      ).toEqual({
        manifest_version: '1.0.1',
        schema_version: 'v1',
        artifacts: {
          'endpoint-exceptionlist-macos-v1': {
            compression_algorithm: 'zlib',
            encryption_algorithm: 'none',
            decoded_sha256: '0a5a2013a79f9e60682472284a1be45ab1ff68b9b43426d00d665016612c15c8',
            encoded_sha256: '57941169bb2c5416f9bd7224776c8462cb9a2be0fe8b87e6213e77a1d29be824',
            decoded_size: 292,
            encoded_size: 131,
            relative_url:
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-macos-v1/0a5a2013a79f9e60682472284a1be45ab1ff68b9b43426d00d665016612c15c8',
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
      });
    });

    test('ManifestManager fails to dispatch on conflict', async () => {
      const packagePolicyService = createPackagePolicyServiceMock();
      const manifestManager = getManifestManagerMock({ packagePolicyService });
      const oldManifest = await manifestManager.getLastComputedManifest();
      const newManifest = await manifestManager.buildNewManifest(oldManifest!);
      const diffs = newManifest.diff(oldManifest!);
      const newArtifactId = diffs[1].id;
      await newManifest.compressArtifact(newArtifactId);

      newManifest.bumpSemanticVersion();

      packagePolicyService.update.mockRejectedValueOnce({ status: 409 });
      const dispatchErrors = await manifestManager.tryDispatch(newManifest);
      expect(dispatchErrors).toEqual([{ status: 409 }]);
    });

    test('ManifestManager can commit manifest', async () => {
      const savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create> = savedObjectsClientMock.create();
      const manifestManager = getManifestManagerMock({
        savedObjectsClient,
      });

      const oldManifest = await manifestManager.getLastComputedManifest();
      const newManifest = await manifestManager.buildNewManifest(oldManifest!);
      const diffs = newManifest.diff(oldManifest!);
      const oldArtifactId = diffs[0].id;
      const newArtifactId = diffs[1].id;
      await newManifest.compressArtifact(newArtifactId);

      const artifact = newManifest.getArtifact(newArtifactId)!;
      if (isCompleteArtifact(artifact)) {
        await manifestManager.pushArtifacts([artifact]);
      } else {
        throw new Error('Artifact is missing a body.');
      }

      await manifestManager.commit(newManifest);
      await manifestManager.deleteArtifacts([oldArtifactId]);

      // created new artifact
      expect(savedObjectsClient.create.mock.calls[0][0]).toEqual(
        ArtifactConstants.SAVED_OBJECT_TYPE
      );

      // committed new manifest
      expect(savedObjectsClient.create.mock.calls[1][0]).toEqual(
        ManifestConstants.SAVED_OBJECT_TYPE
      );

      // deleted old artifact
      expect(savedObjectsClient.delete).toHaveBeenCalledWith(
        ArtifactConstants.SAVED_OBJECT_TYPE,
        oldArtifactId
      );
    });

    test('ManifestManager handles promise rejections when building artifacts', async () => {
      // This test won't fail on an unhandled promise rejection, but it will cause
      // an UnhandledPromiseRejectionWarning to be printed.
      const manifestManager = getManifestManagerMock({
        mockType: ManifestManagerMockType.ListClientPromiseRejection,
      });
      await expect(manifestManager.buildNewManifest()).rejects.toThrow();
    });
  });
});
