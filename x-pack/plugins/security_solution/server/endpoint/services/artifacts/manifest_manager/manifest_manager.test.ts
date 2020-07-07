/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import {
  ArtifactConstants,
  ManifestConstants,
  Manifest,
  ExceptionsCache,
} from '../../../lib/artifacts';
import { getPackageConfigServiceMock, getManifestManagerMock } from './manifest_manager.mock';

describe('manifest_manager', () => {
  describe('ManifestManager sanity checks', () => {
    test('ManifestManager can refresh manifest', async () => {
      const manifestManager = getManifestManagerMock();
      const manifestWrapper = await manifestManager.refresh();
      expect(manifestWrapper!.diffs).toEqual([
        {
          id:
            'endpoint-exceptionlist-linux-1.0.0-2a2ec06c957330deb42f41835d3029001432038106f823173fb9e7ea603decb5',
          type: 'add',
        },
      ]);
      expect(manifestWrapper!.manifest).toBeInstanceOf(Manifest);
    });

    test('ManifestManager populates cache properly', async () => {
      const cache = new ExceptionsCache(5);
      const manifestManager = getManifestManagerMock({ cache });
      const manifestWrapper = await manifestManager.refresh();
      expect(manifestWrapper!.diffs).toEqual([
        {
          id:
            'endpoint-exceptionlist-linux-1.0.0-2a2ec06c957330deb42f41835d3029001432038106f823173fb9e7ea603decb5',
          type: 'add',
        },
      ]);
      const diff = manifestWrapper!.diffs[0];
      const entry = JSON.parse(cache.get(diff!.id)!);
      expect(entry).toEqual({
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
      });
    });

    test('ManifestManager can dispatch manifest', async () => {
      const packageConfigService = getPackageConfigServiceMock();
      const manifestManager = getManifestManagerMock({ packageConfigService });
      const manifestWrapperRefresh = await manifestManager.refresh();
      const manifestWrapperDispatch = await manifestManager.dispatch(manifestWrapperRefresh);
      expect(manifestWrapperRefresh).toEqual(manifestWrapperDispatch);
      const entries = manifestWrapperDispatch!.manifest.getEntries();
      const artifact = Object.values(entries)[0].getArtifact();
      expect(
        packageConfigService.update.mock.calls[0][2].inputs[0].config.artifact_manifest.value
      ).toEqual({
        manifest_version: 'v0',
        schema_version: '1.0.0',
        artifacts: {
          [artifact.identifier]: {
            compression_algorithm: 'none',
            encryption_algorithm: 'none',
            decoded_sha256: artifact.decodedSha256,
            encoded_sha256: artifact.encodedSha256,
            decoded_size: artifact.decodedSize,
            encoded_size: artifact.encodedSize,
            relative_url: `/api/endpoint/artifacts/download/${artifact.identifier}/${artifact.encodedSha256}`,
          },
        },
      });
    });

    test('ManifestManager can commit manifest', async () => {
      const savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create> = savedObjectsClientMock.create();
      const manifestManager = getManifestManagerMock({
        savedObjectsClient,
      });

      const manifestWrapperRefresh = await manifestManager.refresh();
      const manifestWrapperDispatch = await manifestManager.dispatch(manifestWrapperRefresh);
      const diff = {
        id: 'abcd',
        type: 'delete',
      };
      manifestWrapperDispatch!.diffs.push(diff);

      await manifestManager.commit(manifestWrapperDispatch);

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
