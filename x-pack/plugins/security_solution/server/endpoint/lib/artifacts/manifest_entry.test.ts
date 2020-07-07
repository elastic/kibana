/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalArtifactSchema } from '../../schemas';
import { getInternalArtifactMock } from '../../schemas/artifacts/saved_objects.mock';
import { ManifestEntry } from './manifest_entry';

describe('manifest_entry', () => {
  describe('ManifestEntry object sanity checks', () => {
    let artifact: InternalArtifactSchema;
    let manifestEntry: ManifestEntry;

    beforeAll(async () => {
      artifact = await getInternalArtifactMock('windows', '1.0.0');
      manifestEntry = new ManifestEntry(artifact);
    });

    test('Can create manifest entry', () => {
      expect(manifestEntry).toBeInstanceOf(ManifestEntry);
    });

    test('Correct doc_id is returned', () => {
      expect(manifestEntry.getDocId()).toEqual(
        'endpoint-exceptionlist-windows-1.0.0-70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c'
      );
    });

    test('Correct identifier is returned', () => {
      expect(manifestEntry.getIdentifier()).toEqual('endpoint-exceptionlist-windows-1.0.0');
    });

    test('Correct sha256 is returned', () => {
      expect(manifestEntry.getEncodedSha256()).toEqual(
        '70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c'
      );
      expect(manifestEntry.getDecodedSha256()).toEqual(
        '70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c'
      );
    });

    test('Correct size is returned', () => {
      expect(manifestEntry.getEncodedSize()).toEqual(268);
      expect(manifestEntry.getDecodedSize()).toEqual(268);
    });

    test('Correct url is returned', () => {
      expect(manifestEntry.getUrl()).toEqual(
        '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-1.0.0/70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c'
      );
    });

    test('Correct artifact is returned', () => {
      expect(manifestEntry.getArtifact()).toEqual(artifact);
    });

    test('Correct record is returned', () => {
      expect(manifestEntry.getRecord()).toEqual({
        compression_algorithm: 'none',
        encryption_algorithm: 'none',
        decoded_sha256: '70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
        encoded_sha256: '70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
        decoded_size: 268,
        encoded_size: 268,
        relative_url:
          '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-1.0.0/70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
      });
    });
  });
});
