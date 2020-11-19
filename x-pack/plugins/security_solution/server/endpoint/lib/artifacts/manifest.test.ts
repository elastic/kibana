/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManifestSchemaVersion } from '../../../../common/endpoint/schema/common';
import { InternalArtifactCompleteSchema } from '../../schemas';
import { getArtifactId } from './common';
import { Manifest } from './manifest';
import {
  getMockArtifacts,
  getMockManifest,
  getMockManifestWithDiffs,
  getEmptyMockManifest,
} from './mocks';

describe('manifest', () => {
  describe('Manifest object sanity checks', () => {
    let artifacts: InternalArtifactCompleteSchema[] = [];
    let manifest1: Manifest;
    let manifest2: Manifest;
    let emptyManifest: Manifest;

    beforeAll(async () => {
      artifacts = await getMockArtifacts({ compress: true });
      manifest1 = await getMockManifest({ compress: true });
      manifest2 = await getMockManifestWithDiffs({ compress: true });
      emptyManifest = await getEmptyMockManifest({ compress: true });
    });

    test('Can create manifest with valid schema version', () => {
      const manifest = new Manifest();
      expect(manifest).toBeInstanceOf(Manifest);
    });

    test('Cannot create manifest with invalid schema version', () => {
      expect(() => {
        new Manifest({
          schemaVersion: 'abcd' as ManifestSchemaVersion,
        });
      }).toThrow();
    });

    test('Empty manifest transforms correctly to expected endpoint format', async () => {
      expect(emptyManifest.toEndpointFormat()).toStrictEqual({
        artifacts: {
          'endpoint-exceptionlist-macos-v1': {
            compression_algorithm: 'zlib',
            encryption_algorithm: 'none',
            decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
            decoded_size: 14,
            encoded_size: 22,
            relative_url:
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
          },
          'endpoint-exceptionlist-windows-v1': {
            compression_algorithm: 'zlib',
            encryption_algorithm: 'none',
            decoded_sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
            encoded_sha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
            decoded_size: 14,
            encoded_size: 22,
            relative_url:
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
          },
        },
        manifest_version: '1.0.0',
        schema_version: 'v1',
      });
    });

    test('Manifest transforms correctly to expected endpoint format', async () => {
      expect(manifest1.toEndpointFormat()).toStrictEqual({
        artifacts: {
          'endpoint-exceptionlist-macos-v1': {
            compression_algorithm: 'zlib',
            encryption_algorithm: 'none',
            decoded_sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
            encoded_sha256: '975382ab55d019cbab0bbac207a54e2a7d489fad6e8f6de34fc6402e5ef37b1e',
            decoded_size: 432,
            encoded_size: 147,
            relative_url:
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-macos-v1/96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          },
          'endpoint-exceptionlist-windows-v1': {
            compression_algorithm: 'zlib',
            encryption_algorithm: 'none',
            decoded_sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
            encoded_sha256: '975382ab55d019cbab0bbac207a54e2a7d489fad6e8f6de34fc6402e5ef37b1e',
            decoded_size: 432,
            encoded_size: 147,
            relative_url:
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          },
          'endpoint-trustlist-linux-v1': {
            compression_algorithm: 'zlib',
            decoded_sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
            decoded_size: 432,
            encoded_sha256: '975382ab55d019cbab0bbac207a54e2a7d489fad6e8f6de34fc6402e5ef37b1e',
            encoded_size: 147,
            encryption_algorithm: 'none',
            relative_url:
              '/api/endpoint/artifacts/download/endpoint-trustlist-linux-v1/96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          },
          'endpoint-trustlist-macos-v1': {
            compression_algorithm: 'zlib',
            decoded_sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
            decoded_size: 432,
            encoded_sha256: '975382ab55d019cbab0bbac207a54e2a7d489fad6e8f6de34fc6402e5ef37b1e',
            encoded_size: 147,
            encryption_algorithm: 'none',
            relative_url:
              '/api/endpoint/artifacts/download/endpoint-trustlist-macos-v1/96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          },
          'endpoint-trustlist-windows-v1': {
            compression_algorithm: 'zlib',
            decoded_sha256: '96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
            decoded_size: 432,
            encoded_sha256: '975382ab55d019cbab0bbac207a54e2a7d489fad6e8f6de34fc6402e5ef37b1e',
            encoded_size: 147,
            encryption_algorithm: 'none',
            relative_url:
              '/api/endpoint/artifacts/download/endpoint-trustlist-windows-v1/96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          },
        },
        manifest_version: '1.0.0',
        schema_version: 'v1',
      });
    });

    test('Manifest transforms correctly to expected saved object format', async () => {
      expect(manifest1.toSavedObject()).toStrictEqual({
        schemaVersion: 'v1',
        semanticVersion: '1.0.0',
        ids: [
          'endpoint-exceptionlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          'endpoint-exceptionlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          'endpoint-trustlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          'endpoint-trustlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          'endpoint-trustlist-linux-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
        ],
      });
    });

    test('Manifest returns diffs since supplied manifest', async () => {
      const diffs = manifest2.diff(manifest1);
      expect(diffs).toEqual([
        {
          id:
            'endpoint-exceptionlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          type: 'delete',
        },
        {
          id:
            'endpoint-trustlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          type: 'delete',
        },
        {
          id:
            'endpoint-trustlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          type: 'delete',
        },
        {
          id:
            'endpoint-trustlist-linux-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
          type: 'delete',
        },
        {
          id:
            'endpoint-exceptionlist-macos-v1-0a5a2013a79f9e60682472284a1be45ab1ff68b9b43426d00d665016612c15c8',
          type: 'add',
        },
      ]);
    });

    test('Manifest returns data for given artifact', async () => {
      const artifact = artifacts[0];
      const returned = manifest1.getArtifact(getArtifactId(artifact));
      expect(returned).toEqual(artifact);
    });

    test('Manifest returns entries map', async () => {
      const entries = manifest1.getEntries();
      const keys = Object.keys(entries);
      expect(keys).toEqual([
        'endpoint-exceptionlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
        'endpoint-exceptionlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
        'endpoint-trustlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
        'endpoint-trustlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
        'endpoint-trustlist-linux-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3',
      ]);
    });

    test('Manifest returns true if contains artifact', async () => {
      const found = manifest1.contains(
        'endpoint-exceptionlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3'
      );
      expect(found).toEqual(true);
    });

    test('Manifest can be created from list of artifacts', async () => {
      const oldManifest = new Manifest();
      const manifest = Manifest.fromArtifacts(artifacts, oldManifest);
      expect(
        manifest.contains(
          'endpoint-exceptionlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3'
        )
      ).toEqual(true);
      expect(
        manifest.contains(
          'endpoint-exceptionlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3'
        )
      ).toEqual(true);
    });
  });
});
