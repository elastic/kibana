/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AssetParts } from '../../../types';
import { getBufferExtractor, pathParts, splitPkgKey } from './index';
import { untarBuffer, unzipBuffer } from './extract';

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
    expect(pathParts(value.path)).toStrictEqual(value.assetParts as AssetParts);
  }
});

describe('splitPkgKey tests', () => {
  it('throws an error if the delimiter is not found', () => {
    expect(() => {
      splitPkgKey('awesome_package');
    }).toThrow();
  });

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

describe('getBufferExtractor', () => {
  it('returns unzipBuffer if the archive key ends in .zip', () => {
    const extractor = getBufferExtractor('.zip');
    expect(extractor).toBe(unzipBuffer);
  });

  it('returns untarBuffer if the key ends in anything else', () => {
    const extractor = getBufferExtractor('.xyz');
    expect(extractor).toBe(untarBuffer);
  });
});
