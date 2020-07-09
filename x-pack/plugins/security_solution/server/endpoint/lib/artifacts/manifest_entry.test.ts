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
      artifact = await getInternalArtifactMock('windows', 'v1');
      manifestEntry = new ManifestEntry(artifact);
    });

    test('Can create manifest entry', () => {
      expect(manifestEntry).toBeInstanceOf(ManifestEntry);
    });

    test('Correct doc_id is returned', () => {
      expect(manifestEntry.getDocId()).toEqual(
        'endpoint-exceptionlist-windows-v1-5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735'
      );
    });

    test('Correct identifier is returned', () => {
      expect(manifestEntry.getIdentifier()).toEqual('endpoint-exceptionlist-windows-v1');
    });

    test('Correct sha256 is returned', () => {
      expect(manifestEntry.getEncodedSha256()).toEqual(
        '5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735'
      );
      expect(manifestEntry.getDecodedSha256()).toEqual(
        '5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735'
      );
    });

    test('Correct size is returned', () => {
      expect(manifestEntry.getEncodedSize()).toEqual(430);
      expect(manifestEntry.getDecodedSize()).toEqual(430);
    });

    test('Correct url is returned', () => {
      expect(manifestEntry.getUrl()).toEqual(
        '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735'
      );
    });

    test('Correct artifact is returned', () => {
      expect(manifestEntry.getArtifact()).toEqual(artifact);
    });

    test('Correct record is returned', () => {
      expect(manifestEntry.getRecord()).toEqual({
        compression_algorithm: 'none',
        encryption_algorithm: 'none',
        decoded_sha256: '5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
        encoded_sha256: '5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
        decoded_size: 430,
        encoded_size: 430,
        relative_url:
          '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
      });
    });

    // TODO: add test for entry with compression
  });
});
