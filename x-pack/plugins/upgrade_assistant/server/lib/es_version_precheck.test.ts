/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SemVer } from 'semver';
import { ILegacyScopedClusterClient, kibanaResponseFactory } from 'src/core/server';
import { xpackMocks } from '../../../../mocks';
import { CURRENT_VERSION } from '../../common/version';
import {
  esVersionCheck,
  getAllNodeVersions,
  verifyAllMatchKibanaVersion,
} from './es_version_precheck';

describe('getAllNodeVersions', () => {
  it('returns a list of unique node versions', async () => {
    const adminClient = ({
      callAsInternalUser: jest.fn().mockResolvedValue({
        nodes: {
          node1: { version: '7.0.0' },
          node2: { version: '7.0.0' },
          node3: { version: '6.0.0' },
        },
      }),
    } as unknown) as ILegacyScopedClusterClient;

    await expect(getAllNodeVersions(adminClient)).resolves.toEqual([
      new SemVer('6.0.0'),
      new SemVer('7.0.0'),
    ]);
  });
});

describe('verifyAllMatchKibanaVersion', () => {
  it('detects higher version nodes', () => {
    const result = verifyAllMatchKibanaVersion([new SemVer('99999.0.0')]);
    expect(result.allNodesMatch).toBe(false);
    expect(result.allNodesUpgraded).toBe(true);
  });

  it('detects lower version nodes', () => {
    const result = verifyAllMatchKibanaVersion([new SemVer('0.0.0')]);
    expect(result.allNodesMatch).toBe(false);
    expect(result.allNodesUpgraded).toBe(true);
  });

  it('detects if all are on same major correctly', () => {
    const versions = [
      CURRENT_VERSION,
      CURRENT_VERSION.inc('minor'),
      CURRENT_VERSION.inc('minor').inc('minor'),
    ];

    const result = verifyAllMatchKibanaVersion(versions);
    expect(result.allNodesMatch).toBe(true);
    expect(result.allNodesUpgraded).toBe(false);
  });

  it('detects partial matches', () => {
    const versions = [
      new SemVer('0.0.0'),
      CURRENT_VERSION.inc('minor'),
      CURRENT_VERSION.inc('minor').inc('minor'),
    ];

    const result = verifyAllMatchKibanaVersion(versions);
    expect(result.allNodesMatch).toBe(false);
    expect(result.allNodesUpgraded).toBe(false);
  });
});

describe('EsVersionPrecheck', () => {
  it('returns a 403 when callCluster fails with a 403', async () => {
    const fakeCall = jest.fn().mockRejectedValue({ status: 403 });

    const ctx = xpackMocks.createRequestHandlerContext();
    ctx.core.elasticsearch.legacy.client = {
      callAsCurrentUser: jest.fn(),
      callAsInternalUser: fakeCall,
    };

    const result = await esVersionCheck(ctx, kibanaResponseFactory);
    expect(result).toHaveProperty('status', 403);
  });

  it('returns a 426 message w/ allNodesUpgraded = false when nodes are not on same version', async () => {
    const ctx = xpackMocks.createRequestHandlerContext();
    ctx.core.elasticsearch.legacy.client = {
      callAsCurrentUser: jest.fn(),
      callAsInternalUser: jest.fn().mockResolvedValue({
        nodes: {
          node1: { version: CURRENT_VERSION.raw },
          node2: { version: new SemVer(CURRENT_VERSION.raw).inc('major').raw },
        },
      }),
    };

    const result = await esVersionCheck(ctx, kibanaResponseFactory);
    expect(result).toHaveProperty('status', 426);
    expect(result).toHaveProperty('payload.attributes.allNodesUpgraded', false);
  });

  it('returns a 426 message w/ allNodesUpgraded = true when nodes are on next version', async () => {
    const ctx = xpackMocks.createRequestHandlerContext();
    ctx.core.elasticsearch.legacy.client = {
      callAsCurrentUser: jest.fn(),
      callAsInternalUser: jest.fn().mockResolvedValue({
        nodes: {
          node1: { version: new SemVer(CURRENT_VERSION.raw).inc('major').raw },
          node2: { version: new SemVer(CURRENT_VERSION.raw).inc('major').raw },
        },
      }),
    };

    const result = await esVersionCheck(ctx, kibanaResponseFactory);
    expect(result).toHaveProperty('status', 426);
    expect(result).toHaveProperty('payload.attributes.allNodesUpgraded', true);
  });

  it('returns undefined when nodes are on same version', async () => {
    const ctx = xpackMocks.createRequestHandlerContext();
    ctx.core.elasticsearch.legacy.client = {
      callAsCurrentUser: jest.fn(),
      callAsInternalUser: jest.fn().mockResolvedValue({
        nodes: {
          node1: { version: CURRENT_VERSION.raw },
          node2: { version: CURRENT_VERSION.raw },
        },
      }),
    };

    await expect(esVersionCheck(ctx, kibanaResponseFactory)).resolves.toBe(undefined);
  });
});
