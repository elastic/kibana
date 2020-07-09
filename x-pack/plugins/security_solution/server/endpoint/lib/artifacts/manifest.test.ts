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
import { ManifestConstants } from './common';
import { Manifest } from './manifest';

describe('manifest', () => {
  describe('Manifest object sanity checks', () => {
    const artifacts: InternalArtifactSchema[] = [];
    const now = new Date();
    let manifest1: Manifest;
    let manifest2: Manifest;

    beforeAll(async () => {
      const artifactLinux = await getInternalArtifactMock('linux', 'v1');
      const artifactMacos = await getInternalArtifactMock('macos', 'v1');
      const artifactWindows = await getInternalArtifactMock('windows', 'v1');
      artifacts.push(artifactLinux);
      artifacts.push(artifactMacos);
      artifacts.push(artifactWindows);

      manifest1 = new Manifest(now, 'v1', ManifestConstants.INITIAL_VERSION);
      manifest1.addEntry(artifactLinux);
      manifest1.addEntry(artifactMacos);
      manifest1.addEntry(artifactWindows);
      manifest1.setVersion('abcd');

      const newArtifactLinux = await getInternalArtifactMockWithDiffs('linux', 'v1');
      manifest2 = new Manifest(new Date(), 'v1', ManifestConstants.INITIAL_VERSION);
      manifest2.addEntry(newArtifactLinux);
      manifest2.addEntry(artifactMacos);
      manifest2.addEntry(artifactWindows);
    });

    test('Can create manifest with valid schema version', () => {
      const manifest = new Manifest(new Date(), 'v1', ManifestConstants.INITIAL_VERSION);
      expect(manifest).toBeInstanceOf(Manifest);
    });

    test('Cannot create manifest with invalid schema version', () => {
      expect(() => {
        new Manifest(
          new Date(),
          'abcd' as ManifestSchemaVersion,
          ManifestConstants.INITIAL_VERSION
        );
      }).toThrow();
    });

    test('Manifest transforms correctly to expected endpoint format', async () => {
      expect(manifest1.toEndpointFormat()).toStrictEqual({
        artifacts: {
          'endpoint-exceptionlist-linux-v1': {
            compression_algorithm: 'none',
            encryption_algorithm: 'none',
            decoded_sha256: '5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
            encoded_sha256: '5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
            decoded_size: 430,
            encoded_size: 430,
            relative_url:
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-linux-v1/5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
          },
          'endpoint-exceptionlist-macos-v1': {
            compression_algorithm: 'none',
            encryption_algorithm: 'none',
            decoded_sha256: '5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
            encoded_sha256: '5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
            decoded_size: 430,
            encoded_size: 430,
            relative_url:
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-macos-v1/5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
          },
          'endpoint-exceptionlist-windows-v1': {
            compression_algorithm: 'none',
            encryption_algorithm: 'none',
            decoded_sha256: '5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
            encoded_sha256: '5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
            decoded_size: 430,
            encoded_size: 430,
            relative_url:
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
          },
        },
        manifest_version: 'abcd',
        schema_version: 'v1',
      });
    });

    test('Manifest transforms correctly to expected saved object format', async () => {
      expect(manifest1.toSavedObject()).toStrictEqual({
        created: now.getTime(),
        ids: [
          'endpoint-exceptionlist-linux-v1-5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
          'endpoint-exceptionlist-macos-v1-5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
          'endpoint-exceptionlist-windows-v1-5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
        ],
      });
    });

    test('Manifest returns diffs since supplied manifest', async () => {
      const diffs = manifest2.diff(manifest1);
      expect(diffs).toEqual([
        {
          id:
            'endpoint-exceptionlist-linux-v1-5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
          type: 'delete',
        },
        {
          id:
            'endpoint-exceptionlist-linux-v1-3d3546e94f70493021ee845be32c66e36ea7a720c64b4d608d8029fe949f7e51',
          type: 'add',
        },
      ]);
    });

    test('Manifest returns data for given artifact', async () => {
      const artifact = artifacts[0];
      const returned = manifest1.getArtifact(`${artifact.identifier}-${artifact.decodedSha256}`);
      expect(returned).toEqual(artifact);
    });

    test('Manifest returns entries map', async () => {
      const entries = manifest1.getEntries();
      const keys = Object.keys(entries);
      expect(keys).toEqual([
        'endpoint-exceptionlist-linux-v1-5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
        'endpoint-exceptionlist-macos-v1-5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
        'endpoint-exceptionlist-windows-v1-5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735',
      ]);
    });

    test('Manifest returns true if contains artifact', async () => {
      const found = manifest1.contains(
        'endpoint-exceptionlist-macos-v1-5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735'
      );
      expect(found).toEqual(true);
    });

    test('Manifest can be created from list of artifacts', async () => {
      const manifest = Manifest.fromArtifacts(artifacts, 'v1', ManifestConstants.INITIAL_VERSION);
      expect(
        manifest.contains(
          'endpoint-exceptionlist-linux-v1-5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735'
        )
      ).toEqual(true);
      expect(
        manifest.contains(
          'endpoint-exceptionlist-macos-v1-5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735'
        )
      ).toEqual(true);
      expect(
        manifest.contains(
          'endpoint-exceptionlist-windows-v1-5f16e5e338c53e77cfa945c17c11b175c3967bf109aa87131de41fb93b149735'
        )
      ).toEqual(true);
    });
  });
});
