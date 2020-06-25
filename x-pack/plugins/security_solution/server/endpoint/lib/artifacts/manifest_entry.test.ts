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

    test('Can create manifest entry', async () => {
      expect(manifestEntry).toBeInstanceOf(ManifestEntry);
    });

    test('Correct doc_id is returned', async () => {
      expect(manifestEntry.getDocId()).toEqual(
        'endpoint-allowlist-windows-1.0.0-222c07e7741e5d8371958fadc5636141bfa330926886b54b233e6a4ecac86466'
      );
    });

    test('Correct identifier is returned', async () => {
      expect(manifestEntry.getIdentifier()).toEqual('endpoint-allowlist-windows-1.0.0');
    });

    test('Correct sha256 is returned', async () => {
      expect(manifestEntry.getSha256()).toEqual(
        '222c07e7741e5d8371958fadc5636141bfa330926886b54b233e6a4ecac86466'
      );
    });

    test('Correct size is returned', async () => {
      expect(manifestEntry.getSize()).toEqual(268);
    });

    test('Correct url is returned', async () => {
      expect(manifestEntry.getUrl()).toEqual(
        '/api/endpoint/allowlist/download/endpoint-allowlist-windows-1.0.0/222c07e7741e5d8371958fadc5636141bfa330926886b54b233e6a4ecac86466'
      );
    });

    test('Correct artifact is returned', async () => {
      expect(manifestEntry.getArtifact()).toEqual(artifact);
    });

    test('Correct record is returned', async () => {
      expect(manifestEntry.getRecord()).toEqual({
        sha256: '222c07e7741e5d8371958fadc5636141bfa330926886b54b233e6a4ecac86466',
        size: 268,
        url:
          '/api/endpoint/allowlist/download/endpoint-allowlist-windows-1.0.0/222c07e7741e5d8371958fadc5636141bfa330926886b54b233e6a4ecac86466',
      });
    });
  });
});
