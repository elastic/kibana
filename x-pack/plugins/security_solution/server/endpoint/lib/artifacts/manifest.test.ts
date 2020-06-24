/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getInternalArtifactMock } from '../../schemas';
import { Manifest } from './manifest';
import { ManifestEntry } from './manifest_entry';

describe('manifest', () => {
  describe('Manifest object sanity checks', () => {
    test('Can create manifest with valid schema version', () => {
      const manifest = new Manifest(Date.now(), '1.0.0');
      expect(manifest).toBeInstanceOf(Manifest);
    });

    test('Cannot create manifest with invalid schema version', () => {
      expect(() => {
        new Manifest(Date.now(), 'abcd');
      }).toThrow();
    });

    test('Manifest transforms correctly to expected endpoint format', async () => {
      const manifest = new Manifest(Date.now(), '1.0.0');
      manifest.addEntry(await getInternalArtifactMock('linux', '1.0.0'));
      manifest.addEntry(await getInternalArtifactMock('macos', '1.0.0'));
      manifest.addEntry(await getInternalArtifactMock('windows', '1.0.0'));
      manifest.setVersion('abcd');
      expect(manifest.toEndpointFormat()).toStrictEqual({
        artifacts: {
          'endpoint-allowlist-linux-1.0.0': {
            sha256: '222c07e7741e5d8371958fadc5636141bfa330926886b54b233e6a4ecac86466',
            size: 268,
            url:
              '/api/endpoint/allowlist/download/endpoint-allowlist-linux-1.0.0/222c07e7741e5d8371958fadc5636141bfa330926886b54b233e6a4ecac86466',
          },
          'endpoint-allowlist-macos-1.0.0': {
            sha256: '222c07e7741e5d8371958fadc5636141bfa330926886b54b233e6a4ecac86466',
            size: 268,
            url:
              '/api/endpoint/allowlist/download/endpoint-allowlist-macos-1.0.0/222c07e7741e5d8371958fadc5636141bfa330926886b54b233e6a4ecac86466',
          },
          'endpoint-allowlist-windows-1.0.0': {
            sha256: '222c07e7741e5d8371958fadc5636141bfa330926886b54b233e6a4ecac86466',
            size: 268,
            url:
              '/api/endpoint/allowlist/download/endpoint-allowlist-windows-1.0.0/222c07e7741e5d8371958fadc5636141bfa330926886b54b233e6a4ecac86466',
          },
        },
        manifestVersion: 'abcd',
        schemaVersion: '1.0.0',
      });
    });

    test('Manifest cannot be converted to endpoint format without a version', async () => {
      const manifest = new Manifest(Date.now(), '1.0.0');
      manifest.addEntry(await getInternalArtifactMock('linux', '1.0.0'));
      manifest.addEntry(await getInternalArtifactMock('macos', '1.0.0'));
      manifest.addEntry(await getInternalArtifactMock('windows', '1.0.0'));
      expect(manifest.toEndpointFormat).toThrow();
    });

    test('Manifest transforms correctly to expected saved object format', async () => {
      const now = Date.now();
      const manifest = new Manifest(now, '1.0.0');
      manifest.addEntry(await getInternalArtifactMock('linux', '1.0.0'));
      manifest.addEntry(await getInternalArtifactMock('macos', '1.0.0'));
      manifest.addEntry(await getInternalArtifactMock('windows', '1.0.0'));
      manifest.setVersion('abcd');
      expect(manifest.toSavedObject()).toStrictEqual({
        created: now,
        ids: [
          'endpoint-allowlist-linux-1.0.0-222c07e7741e5d8371958fadc5636141bfa330926886b54b233e6a4ecac86466',
          'endpoint-allowlist-macos-1.0.0-222c07e7741e5d8371958fadc5636141bfa330926886b54b233e6a4ecac86466',
          'endpoint-allowlist-windows-1.0.0-222c07e7741e5d8371958fadc5636141bfa330926886b54b233e6a4ecac86466',
        ],
      });
    });

    test('Manifest returns diffs since supplied manifest', async () => {
      // TODO
    });

    test('Manifest returns data for given artifact', async () => {
      // TODO
    });

    test('Manifest returns entries map', async () => {
      // TODO
    });

    test('Manifest returns true if contains artifact', async () => {
      // TODO
    });

    test('Manifest can be created from list of artifacts', async () => {
      // TODO
    });
  });
});
