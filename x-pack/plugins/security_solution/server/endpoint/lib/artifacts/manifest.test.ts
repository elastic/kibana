/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManifestSchemaVersion } from '../../../../common/endpoint/schema/common';
import { InternalArtifactSchema } from '../../schemas';
import {
  getInternalArtifactMock,
  getInternalArtifactMockWithDiffs,
} from '../../schemas/artifacts/saved_objects.mock';
import { Manifest } from './manifest';

describe('manifest', () => {
  describe('Manifest object sanity checks', () => {
    const artifacts: InternalArtifactSchema[] = [];
    const now = new Date();
    let manifest1: Manifest;
    let manifest2: Manifest;

    beforeAll(async () => {
      const artifactLinux = await getInternalArtifactMock('linux', '1.0.0');
      const artifactMacos = await getInternalArtifactMock('macos', '1.0.0');
      const artifactWindows = await getInternalArtifactMock('windows', '1.0.0');
      artifacts.push(artifactLinux);
      artifacts.push(artifactMacos);
      artifacts.push(artifactWindows);

      manifest1 = new Manifest(now, '1.0.0', 'v0');
      manifest1.addEntry(artifactLinux);
      manifest1.addEntry(artifactMacos);
      manifest1.addEntry(artifactWindows);
      manifest1.setVersion('abcd');

      const newArtifactLinux = await getInternalArtifactMockWithDiffs('linux', '1.0.0');
      manifest2 = new Manifest(new Date(), '1.0.0', 'v0');
      manifest2.addEntry(newArtifactLinux);
      manifest2.addEntry(artifactMacos);
      manifest2.addEntry(artifactWindows);
    });

    test('Can create manifest with valid schema version', () => {
      const manifest = new Manifest(new Date(), '1.0.0', 'v0');
      expect(manifest).toBeInstanceOf(Manifest);
    });

    test('Cannot create manifest with invalid schema version', () => {
      expect(() => {
        new Manifest(new Date(), 'abcd' as ManifestSchemaVersion, 'v0');
      }).toThrow();
    });

    test('Manifest transforms correctly to expected endpoint format', async () => {
      expect(manifest1.toEndpointFormat()).toStrictEqual({
        artifacts: {
          'endpoint-exceptionlist-linux-1.0.0': {
            sha256: '70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
            size: 268,
            url:
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-linux-1.0.0/70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
          },
          'endpoint-exceptionlist-macos-1.0.0': {
            sha256: '70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
            size: 268,
            url:
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-macos-1.0.0/70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
          },
          'endpoint-exceptionlist-windows-1.0.0': {
            sha256: '70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
            size: 268,
            url:
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-1.0.0/70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
          },
        },
        manifest_version: 'abcd',
        schema_version: '1.0.0',
      });
    });

    test('Manifest transforms correctly to expected saved object format', async () => {
      expect(manifest1.toSavedObject()).toStrictEqual({
        created: now.getTime(),
        ids: [
          'endpoint-exceptionlist-linux-1.0.0-70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
          'endpoint-exceptionlist-macos-1.0.0-70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
          'endpoint-exceptionlist-windows-1.0.0-70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
        ],
      });
    });

    test('Manifest returns diffs since supplied manifest', async () => {
      const diffs = manifest2.diff(manifest1);
      expect(diffs).toEqual([
        {
          id:
            'endpoint-exceptionlist-linux-1.0.0-70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
          type: 'delete',
        },
        {
          id:
            'endpoint-exceptionlist-linux-1.0.0-69328f83418f4957470640ed6cc605be6abb5fe80e0e388fd74f9764ad7ed5d1',
          type: 'add',
        },
      ]);
    });

    test('Manifest returns data for given artifact', async () => {
      const artifact = artifacts[0];
      const returned = manifest1.getArtifact(`${artifact.identifier}-${artifact.sha256}`);
      expect(returned).toEqual(artifact);
    });

    test('Manifest returns entries map', async () => {
      const entries = manifest1.getEntries();
      const keys = Object.keys(entries);
      expect(keys).toEqual([
        'endpoint-exceptionlist-linux-1.0.0-70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
        'endpoint-exceptionlist-macos-1.0.0-70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
        'endpoint-exceptionlist-windows-1.0.0-70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c',
      ]);
    });

    test('Manifest returns true if contains artifact', async () => {
      const found = manifest1.contains(
        'endpoint-exceptionlist-macos-1.0.0-70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c'
      );
      expect(found).toEqual(true);
    });

    test('Manifest can be created from list of artifacts', async () => {
      const manifest = Manifest.fromArtifacts(artifacts, '1.0.0', 'v0');
      expect(
        manifest.contains(
          'endpoint-exceptionlist-linux-1.0.0-70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c'
        )
      ).toEqual(true);
      expect(
        manifest.contains(
          'endpoint-exceptionlist-macos-1.0.0-70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c'
        )
      ).toEqual(true);
      expect(
        manifest.contains(
          'endpoint-exceptionlist-windows-1.0.0-70d2e0ee5db0073b242df9af32e64447b932b73c3e66de3a922c61a4077b1a9c'
        )
      ).toEqual(true);
    });
  });
});
