/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { inflateSync } from 'zlib';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { createPackageConfigServiceMock } from '../../../../../../ingest_manager/server/mocks';
import {
  ArtifactConstants,
  ManifestConstants,
  Manifest,
  ExceptionsCache,
} from '../../../lib/artifacts';
import { getManifestManagerMock } from './manifest_manager.mock';

describe('manifest_manager', () => {
  describe('ManifestManager sanity checks', () => {
    test('ManifestManager can snapshot manifest', async () => {
      const manifestManager = getManifestManagerMock();
      const snapshot = await manifestManager.getSnapshot();
      expect(snapshot!.diffs).toEqual([
        {
          id:
            'endpoint-exceptionlist-linux-v1-1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
          type: 'add',
        },
      ]);
      expect(snapshot!.manifest).toBeInstanceOf(Manifest);
    });

    test('ManifestManager populates cache properly', async () => {
      const cache = new ExceptionsCache(5);
      const manifestManager = getManifestManagerMock({ cache });
      const snapshot = await manifestManager.getSnapshot();
      expect(snapshot!.diffs).toEqual([
        {
          id:
            'endpoint-exceptionlist-linux-v1-1a8295e6ccb93022c6f5ceb8997b29f2912389b3b38f52a8f5a2ff7b0154b1bc',
          type: 'add',
        },
      ]);
      await manifestManager.syncArtifacts(snapshot!, 'add');
      const diff = snapshot!.diffs[0];
      const entry = JSON.parse(inflateSync(cache.get(diff!.id)! as Buffer).toString());
      expect(entry).toEqual({
        entries: [
          {
            type: 'simple',
            entries: [
              {
                entries: [
                  {
                    field: 'nested.field',
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

    test('ManifestManager can dispatch manifest', async () => {
      const packageConfigService = createPackageConfigServiceMock();
      const manifestManager = getManifestManagerMock({ packageConfigService });
      const snapshot = await manifestManager.getSnapshot();
      const dispatchErrors = await manifestManager.dispatch(snapshot!.manifest);
      expect(dispatchErrors).toEqual([]);
      const entries = snapshot!.manifest.getEntries();
      const artifact = Object.values(entries)[0].getArtifact();
      expect(
        packageConfigService.update.mock.calls[0][2].inputs[0].config!.artifact_manifest.value
      ).toEqual({
        manifest_version: ManifestConstants.INITIAL_VERSION,
        schema_version: 'v1',
        artifacts: {
          [artifact.identifier]: {
            compression_algorithm: 'none',
            encryption_algorithm: 'none',
            decoded_sha256: artifact.decodedSha256,
            encoded_sha256: artifact.encodedSha256,
            decoded_size: artifact.decodedSize,
            encoded_size: artifact.encodedSize,
            relative_url: `/api/endpoint/artifacts/download/${artifact.identifier}/${artifact.decodedSha256}`,
          },
        },
      });
    });

    test('ManifestManager fails to dispatch on conflict', async () => {
      const packageConfigService = createPackageConfigServiceMock();
      const manifestManager = getManifestManagerMock({ packageConfigService });
      const snapshot = await manifestManager.getSnapshot();
      packageConfigService.update.mockRejectedValue({ status: 409 });
      const dispatchErrors = await manifestManager.dispatch(snapshot!.manifest);
      expect(dispatchErrors).toEqual([{ status: 409 }]);
      const entries = snapshot!.manifest.getEntries();
      const artifact = Object.values(entries)[0].getArtifact();
      expect(
        packageConfigService.update.mock.calls[0][2].inputs[0].config!.artifact_manifest.value
      ).toEqual({
        manifest_version: ManifestConstants.INITIAL_VERSION,
        schema_version: 'v1',
        artifacts: {
          [artifact.identifier]: {
            compression_algorithm: 'none',
            encryption_algorithm: 'none',
            decoded_sha256: artifact.decodedSha256,
            encoded_sha256: artifact.encodedSha256,
            decoded_size: artifact.decodedSize,
            encoded_size: artifact.encodedSize,
            relative_url: `/api/endpoint/artifacts/download/${artifact.identifier}/${artifact.decodedSha256}`,
          },
        },
      });
    });

    test('ManifestManager can commit manifest', async () => {
      const savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create> = savedObjectsClientMock.create();
      const manifestManager = getManifestManagerMock({
        savedObjectsClient,
      });

      const snapshot = await manifestManager.getSnapshot();
      await manifestManager.syncArtifacts(snapshot!, 'add');

      const diff = {
        id: 'abcd',
        type: 'delete',
      };
      snapshot!.diffs.push(diff);

      const dispatched = await manifestManager.dispatch(snapshot!.manifest);
      expect(dispatched).toEqual([]);

      await manifestManager.commit(snapshot!.manifest);

      await manifestManager.syncArtifacts(snapshot!, 'delete');

      // created new artifact
      expect(savedObjectsClient.create.mock.calls[0][0]).toEqual(
        ArtifactConstants.SAVED_OBJECT_TYPE
      );

      // deleted old artifact
      expect(savedObjectsClient.delete).toHaveBeenCalledWith(
        ArtifactConstants.SAVED_OBJECT_TYPE,
        'abcd'
      );

      // committed new manifest
      expect(savedObjectsClient.create.mock.calls[1][0]).toEqual(
        ManifestConstants.SAVED_OBJECT_TYPE
      );
    });
  });
});
