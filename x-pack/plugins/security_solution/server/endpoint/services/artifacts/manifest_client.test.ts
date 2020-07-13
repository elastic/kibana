/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import { ManifestSchemaVersion } from '../../../../common/endpoint/schema/common';
import { ManifestConstants } from '../../lib/artifacts';
import { getInternalManifestMock } from '../../schemas/artifacts/saved_objects.mock';
import { getManifestClientMock } from './manifest_client.mock';
import { ManifestClient } from './manifest_client';

describe('manifest_client', () => {
  describe('ManifestClient sanity checks', () => {
    test('can create ManifestClient', () => {
      const manifestClient = new ManifestClient(savedObjectsClientMock.create(), 'v1');
      expect(manifestClient).toBeInstanceOf(ManifestClient);
    });

    test('cannot create ManifestClient with invalid schema version', () => {
      expect(() => {
        new ManifestClient(savedObjectsClientMock.create(), 'invalid' as ManifestSchemaVersion);
      }).toThrow();
    });

    test('can get manifest', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const manifestClient = getManifestClientMock(savedObjectsClient);
      await manifestClient.getManifest();
      expect(savedObjectsClient.get).toHaveBeenCalled();
    });

    test('can create manifest', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const manifestClient = getManifestClientMock(savedObjectsClient);
      const manifest = getInternalManifestMock();
      await manifestClient.createManifest(manifest);
      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        ManifestConstants.SAVED_OBJECT_TYPE,
        manifest,
        { id: manifestClient.getManifestId() }
      );
    });

    test('can update manifest', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const manifestClient = getManifestClientMock(savedObjectsClient);
      const manifest = getInternalManifestMock();
      await manifestClient.updateManifest(manifest, { version: 'abcd' });
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        ManifestConstants.SAVED_OBJECT_TYPE,
        manifestClient.getManifestId(),
        manifest,
        { version: 'abcd' }
      );
    });

    test('can delete manifest', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const manifestClient = getManifestClientMock(savedObjectsClient);
      await manifestClient.deleteManifest();
      expect(savedObjectsClient.delete).toHaveBeenCalledWith(
        ManifestConstants.SAVED_OBJECT_TYPE,
        manifestClient.getManifestId()
      );
    });
  });
});
