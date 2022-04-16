/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetParts } from '../../../types';
import { getBufferExtractor, getPathParts, untarBuffer, unzipBuffer } from '../archive';

import { splitPkgKey } from '.';

const testPaths = [
  {
    path: 'foo-1.1.0/service/type/file.yml',
    assetParts: {
      dataset: undefined,
      file: 'file.yml',
      path: 'foo-1.1.0/service/type/file.yml',
      pkgkey: 'foo-1.1.0',
      service: 'service',
      type: 'type',
    },
  },
  {
    path: 'iptables-1.0.4/kibana/visualization/683402b0-1f29-11e9-8ec4-cf5d91a864b3-ecs.json',
    assetParts: {
      dataset: undefined,
      file: '683402b0-1f29-11e9-8ec4-cf5d91a864b3-ecs.json',
      path: 'iptables-1.0.4/kibana/visualization/683402b0-1f29-11e9-8ec4-cf5d91a864b3-ecs.json',
      pkgkey: 'iptables-1.0.4',
      service: 'kibana',
      type: 'visualization',
    },
  },
  {
    path: 'coredns-1.0.1/data_stream/stats/fields/coredns.stats.yml',
    assetParts: {
      dataset: 'stats',
      file: 'coredns.stats.yml',
      path: 'coredns-1.0.1/data_stream/stats/fields/coredns.stats.yml',
      pkgkey: 'coredns-1.0.1',
      service: '',
      type: 'fields',
    },
  },
];

test('testPathParts', () => {
  for (const value of testPaths) {
    expect(getPathParts(value.path)).toStrictEqual(value.assetParts as AssetParts);
  }
});

describe('splitPkgKey tests', () => {
  it('throws an error if there is nothing before the delimiter', () => {
    expect(() => {
      splitPkgKey('-0.0.1-dev1');
    }).toThrow();
  });

  it('throws an error if the version is not a semver', () => {
    expect(() => {
      splitPkgKey('awesome-laskdfj');
    }).toThrow();
  });

  it('returns name and empty version if no delimiter is found', () => {
    const { pkgName, pkgVersion } = splitPkgKey('awesome_package');
    expect(pkgName).toBe('awesome_package');
    expect(pkgVersion).toBe('');
  });

  it('returns the name and version if the delimiter is found once', () => {
    const { pkgName, pkgVersion } = splitPkgKey('awesome-0.1.0');
    expect(pkgName).toBe('awesome');
    expect(pkgVersion).toBe('0.1.0');
  });

  it('returns the name and version if the delimiter is found multiple times', () => {
    const { pkgName, pkgVersion } = splitPkgKey('endpoint-0.13.0-alpha.1+abcd');
    expect(pkgName).toBe('endpoint');
    expect(pkgVersion).toBe('0.13.0-alpha.1+abcd');
  });
});

describe('getBufferExtractor called with { archivePath }', () => {
  it('returns unzipBuffer if `archivePath` ends in .zip', () => {
    const extractor = getBufferExtractor({ archivePath: '.zip' });
    expect(extractor).toBe(unzipBuffer);
  });

  it('returns untarBuffer if `archivePath` ends in .gz', () => {
    const extractor = getBufferExtractor({ archivePath: '.gz' });
    expect(extractor).toBe(untarBuffer);
    const extractor2 = getBufferExtractor({ archivePath: '.tar.gz' });
    expect(extractor2).toBe(untarBuffer);
  });

  it('returns `undefined` if `archivePath` ends in anything else', () => {
    const extractor = getBufferExtractor({ archivePath: '.xyz' });
    expect(extractor).toEqual(undefined);
  });
});

describe('getBufferExtractor called with { contentType }', () => {
  it('returns unzipBuffer if `contentType` is `application/zip`', () => {
    const extractor = getBufferExtractor({ contentType: 'application/zip' });
    expect(extractor).toBe(unzipBuffer);
  });

  it('returns untarBuffer if `contentType` is `application/gzip`', () => {
    const extractor = getBufferExtractor({ contentType: 'application/gzip' });
    expect(extractor).toBe(untarBuffer);
  });

  it('returns `undefined` if `contentType` ends in anything else', () => {
    const extractor = getBufferExtractor({ contentType: '.xyz' });
    expect(extractor).toEqual(undefined);
  });
});
