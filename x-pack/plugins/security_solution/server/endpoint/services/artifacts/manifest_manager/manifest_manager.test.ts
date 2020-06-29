/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from '../../../../../../../../src/core/server/mocks';
import { ArtifactConstants, ManifestConstants, Manifest } from '../../../lib/artifacts';
import { getArtifactClientMock } from '../artifact_client.mock';
import { getManifestClientMock } from '../manifest_client.mock';
import { ManifestManager } from './manifest_manager';
import { getDatasourceServiceMock, getManifestManagerMock } from './manifest_manager.mock';

describe('manifest_manager', () => {
  describe('ManifestManager sanity checks', () => {
    beforeAll(async () => {});

    test('ManifestManager can refresh manifest', async () => {
      const manifestManager = getManifestManagerMock();
      const manifestWrapper = await manifestManager.refresh();
      expect(manifestManager.getLastDispatchedManifest).toHaveBeenCalled();
      expect(manifestWrapper.diffs).toEqual([
        {
          id:
            'endpoint-allowlist-linux-1.0.0-a0b2886af05849e1e7e7b05bd6e38ea2e2de6566bfb5f4bdbdeda8236de0ff5c',
          type: 'add',
        },
      ]);
      expect(manifestWrapper.manifest).toBeInstanceOf(Manifest);
    });

    test('ManifestManager can dispatch manifest', async () => {
      const datasourceService = getDatasourceServiceMock();
      const manifestManager = getManifestManagerMock({ datasourceServiceMock: datasourceService });
      const manifestWrapperRefresh = await manifestManager.refresh();
      const manifestWrapperDispatch = await manifestManager.dispatch(manifestWrapperRefresh);
      expect(manifestWrapperRefresh).toEqual(manifestWrapperDispatch);
      const entries = manifestWrapperDispatch.manifest.entries;
      const artifact = Object.values(entries)[0].artifact;
      expect(datasourceService.update.mock.calls[0][2].inputs[0].config.artifact_manifest).toEqual({
        manifestVersion: 'baseline',
        schemaVersion: '1.0.0',
        artifacts: {
          [artifact.identifier]: {
            sha256: artifact.sha256,
            size: artifact.size,
            url: `/api/endpoint/allowlist/download/${artifact.identifier}/${artifact.sha256}`,
          },
        },
      });
    });

    test('ManifestManager can commit manifest', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const artifactClient = getArtifactClientMock(savedObjectsClient);
      const manifestClient = getManifestClientMock(savedObjectsClient);
      const manifestManager = getManifestManagerMock({
        artifactClientMock: artifactClient,
        manifestClientMock: manifestClient,
      });

      const manifestWrapperRefresh = await manifestManager.refresh();
      const manifestWrapperDispatch = await manifestManager.dispatch(manifestWrapperRefresh);
      const diff = {
        id: 'abcd',
        type: 'delete',
      };
      manifestWrapperDispatch.diffs.push(diff);

      await manifestManager.commit(manifestWrapperDispatch);

      expect(savedObjectsClient.delete).toHaveBeenCalledWith(
        ArtifactConstants.SAVED_OBJECT_TYPE,
        'abcd'
      );

      // TODO: check manifestClient.create/update
    });
  });
});
