/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SemVer } from 'semver';
import { CURRENT_VERSION } from '../../common/version';
import {
  EsVersionPrecheck,
  getAllNodeVersions,
  verifyAllMatchKibanaVersion,
} from './es_version_precheck';

describe('getAllNodeVersions', () => {
  it('returns a list of unique node versions', async () => {
    const callCluster = jest.fn().mockResolvedValue({
      nodes: {
        node1: { version: '7.0.0' },
        node2: { version: '7.0.0' },
        node3: { version: '6.0.0' },
      },
    });

    await expect(getAllNodeVersions(callCluster)).resolves.toEqual([
      new SemVer('6.0.0'),
      new SemVer('7.0.0'),
    ]);
  });
});

describe('verifyAllMatchKibanaVersion', () => {
  it('throws if any are higher version', () => {
    expect(() =>
      verifyAllMatchKibanaVersion([new SemVer('99999.0.0')])
    ).toThrowErrorMatchingInlineSnapshot(
      `"There are some nodes running a different version of Elasticsearch"`
    );
  });

  it('throws if any are lower version', () => {
    expect(() =>
      verifyAllMatchKibanaVersion([new SemVer('0.0.0')])
    ).toThrowErrorMatchingInlineSnapshot(
      `"There are some nodes running a different version of Elasticsearch"`
    );
  });

  it('does not throw if all are same major', () => {
    const versions = [
      CURRENT_VERSION,
      CURRENT_VERSION.inc('minor'),
      CURRENT_VERSION.inc('minor').inc('minor'),
    ];

    expect(() => verifyAllMatchKibanaVersion(versions)).not.toThrow();
  });
});

describe('EsVersionPrecheck', () => {
  it('throws a 403 when callCluster fails with a 403', async () => {
    const fakeCallWithRequest = jest.fn().mockRejectedValue({ status: 403 });
    const fakeGetCluster = jest.fn(() => ({ callWithRequest: fakeCallWithRequest }));
    const fakeRequest = {
      server: { plugins: { elasticsearch: { getCluster: fakeGetCluster } } },
    } as any;

    await expect(EsVersionPrecheck.method(fakeRequest, {} as any)).rejects.toHaveProperty(
      'output.statusCode',
      403
    );
  });

  it('throws a 426 message w/ allNodesUpgraded = false when nodes are not on same version', async () => {
    const fakeCallWithRequest = jest.fn().mockResolvedValue({
      nodes: {
        node1: { version: CURRENT_VERSION.raw },
        node2: { version: new SemVer(CURRENT_VERSION.raw).inc('major').raw },
      },
    });
    const fakeGetCluster = jest.fn(() => ({ callWithRequest: fakeCallWithRequest }));
    const fakeRequest = {
      server: { plugins: { elasticsearch: { getCluster: fakeGetCluster } } },
    } as any;

    const result = EsVersionPrecheck.method(fakeRequest, {} as any);
    await expect(result).rejects.toHaveProperty('output.statusCode', 426);
    await expect(result).rejects.toHaveProperty(
      'output.payload.attributes.allNodesUpgraded',
      false
    );
  });

  it('throws a 426 message w/ allNodesUpgraded = true when nodes are on next version', async () => {
    const fakeCallWithRequest = jest.fn().mockResolvedValue({
      nodes: {
        node1: { version: new SemVer(CURRENT_VERSION.raw).inc('major').raw },
        node2: { version: new SemVer(CURRENT_VERSION.raw).inc('major').raw },
      },
    });
    const fakeGetCluster = jest.fn(() => ({ callWithRequest: fakeCallWithRequest }));
    const fakeRequest = {
      server: { plugins: { elasticsearch: { getCluster: fakeGetCluster } } },
    } as any;

    const result = EsVersionPrecheck.method(fakeRequest, {} as any);
    await expect(result).rejects.toHaveProperty('output.statusCode', 426);
    await expect(result).rejects.toHaveProperty('output.payload.attributes.allNodesUpgraded', true);
  });

  it('returns true when nodes are on same version', async () => {
    const fakeCallWithRequest = jest.fn().mockResolvedValue({
      nodes: {
        node1: { version: CURRENT_VERSION.raw },
        node2: { version: CURRENT_VERSION.raw },
      },
    });
    const fakeGetCluster = jest.fn(() => ({ callWithRequest: fakeCallWithRequest }));
    const fakeRequest = {
      server: { plugins: { elasticsearch: { getCluster: fakeGetCluster } } },
    } as any;

    await expect(EsVersionPrecheck.method(fakeRequest, {} as any)).resolves.toBe(true);
  });
});
