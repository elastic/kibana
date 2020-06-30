/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import { ArtifactConstants, ManifestConstants, Manifest } from '../../../lib/artifacts';
import { getDatasourceServiceMock, getManifestManagerMock } from './manifest_manager.mock';

describe('manifest_manager', () => {
  describe('ManifestManager sanity checks', () => {
    test('ManifestManager can refresh manifest', async () => {
      const manifestManager = getManifestManagerMock();
      const manifestWrapper = await manifestManager.refresh();
      expect(manifestWrapper!.diffs).toEqual([
        {
          id:
            'endpoint-exceptionlist-linux-1.0.0-a0b2886af05849e1e7e7b05bd6e38ea2e2de6566bfb5f4bdbdeda8236de0ff5c',
          type: 'add',
        },
      ]);
      expect(manifestWrapper!.manifest).toBeInstanceOf(Manifest);
    });

    test('ManifestManager can dispatch manifest', async () => {
      const datasourceService = getDatasourceServiceMock();
      const manifestManager = getManifestManagerMock({ datasourceService });
      const manifestWrapperRefresh = await manifestManager.refresh();
      const manifestWrapperDispatch = await manifestManager.dispatch(manifestWrapperRefresh);
      expect(manifestWrapperRefresh).toEqual(manifestWrapperDispatch);
      const entries = manifestWrapperDispatch!.manifest.getEntries();
      const artifact = Object.values(entries)[0].getArtifact();
      expect(
        datasourceService.update.mock.calls[0][2].inputs[0].config.artifact_manifest.value
      ).toEqual({
        manifest_version: 'v0',
        schema_version: '1.0.0',
        artifacts: {
          [artifact.identifier]: {
            sha256: artifact.sha256,
            size: artifact.size,
            url: `/api/endpoint/artifacts/download/${artifact.identifier}/${artifact.sha256}`,
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
