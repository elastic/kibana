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
      artifact = await getInternalArtifactMock('windows', 'v1', { compress: true });
      manifestEntry = new ManifestEntry(artifact);
    });

    test('Can create manifest entry', () => {
      expect(manifestEntry).toBeInstanceOf(ManifestEntry);
    });

    test('Correct doc_id is returned', () => {
      expect(manifestEntry.getDocId()).toEqual(
        'endpoint-exceptionlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3'
      );
    });

    test('Correct identifier is returned', () => {
      expect(manifestEntry.getIdentifier()).toEqual('endpoint-exceptionlist-windows-v1');
    });

    test('Correct sha256 is returned', () => {
      expect(manifestEntry.getEncodedSha256()).toEqual(
        '975382ab55d019cbab0bbac207a54e2a7d489fad6e8f6de34fc6402e5ef37b1e'
      );
      expect(manifestEntry.getDecodedSha256()).toEqual(
        '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3'
      );
    });

    test('Correct size is returned', () => {
      expect(manifestEntry.getEncodedSize()).toEqual(147);
      expect(manifestEntry.getDecodedSize()).toEqual(432);
    });

    test('Correct url is returned', () => {
      expect(manifestEntry.getUrl()).toEqual(
        '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3'
      );
    });

    test('Correct artifact is returned', () => {
      expect(manifestEntry.getArtifact()).toEqual(artifact);
    });

    test('Correct record is returned', () => {
      expect(manifestEntry.getRecord()).toEqual({
        compression_algorithm: 'zlib',
        encryption_algorithm: 'none',
        decoded_sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
        encoded_sha256: '975382ab55d019cbab0bbac207a54e2a7d489fad6e8f6de34fc6402e5ef37b1e',
        decoded_size: 432,
        encoded_size: 147,
        relative_url:
          '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
      });
    });
  });
});
