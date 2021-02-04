/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SemVer } from 'semver';
import { IScopedClusterClient, kibanaResponseFactory } from 'src/core/server';
import { coreMock } from 'src/core/server/mocks';
import { licensingMock } from '../../../../plugins/licensing/server/mocks';
import { MOCK_VERSION_STRING, getMockVersionInfo } from './__fixtures__/version';

import {
  esVersionCheck,
  getAllNodeVersions,
  verifyAllMatchKibanaVersion,
} from './es_version_precheck';
import { versionService } from './version';

const { currentMajor, currentVersion } = getMockVersionInfo();

// Re-implement the mock that was imported directly from `x-pack/mocks`
function createCoreRequestHandlerContextMock() {
  return {
    core: coreMock.createRequestHandlerContext(),
    licensing: licensingMock.createRequestHandlerContext(),
  };
}

const xpackMocks = {
  createRequestHandlerContext: createCoreRequestHandlerContextMock,
};

describe('getAllNodeVersions', () => {
  it('returns a list of unique node versions', async () => {
    const adminClient = ({
      asInternalUser: {
        nodes: {
          info: jest.fn().mockResolvedValue({
            body: {
              nodes: {
                node1: { version: '7.0.0' },
                node2: { version: '7.0.0' },
                node3: { version: '6.0.0' },
              },
            },
          }),
        },
      },
    } as unknown) as IScopedClusterClient;

    await expect(getAllNodeVersions(adminClient)).resolves.toEqual([
      new SemVer('6.0.0'),
      new SemVer('7.0.0'),
    ]);
  });
});

describe('verifyAllMatchKibanaVersion', () => {
  it('detects higher version nodes', () => {
    const result = verifyAllMatchKibanaVersion([new SemVer('99999.0.0')], currentMajor);
    expect(result.allNodesMatch).toBe(false);
    expect(result.allNodesUpgraded).toBe(true);
  });

  it('detects lower version nodes', () => {
    const result = verifyAllMatchKibanaVersion([new SemVer('0.0.0')], currentMajor);
    expect(result.allNodesMatch).toBe(false);
    expect(result.allNodesUpgraded).toBe(true);
  });

  it('detects if all are on same major correctly', () => {
    const versions = [
      currentVersion,
      currentVersion.inc('minor'),
      currentVersion.inc('minor').inc('minor'),
    ];

    const result = verifyAllMatchKibanaVersion(versions, currentMajor);
    expect(result.allNodesMatch).toBe(true);
    expect(result.allNodesUpgraded).toBe(false);
  });

  it('detects partial matches', () => {
    const versions = [
      new SemVer('0.0.0'),
      currentVersion.inc('minor'),
      currentVersion.inc('minor').inc('minor'),
    ];

    const result = verifyAllMatchKibanaVersion(versions, currentMajor);
    expect(result.allNodesMatch).toBe(false);
    expect(result.allNodesUpgraded).toBe(false);
  });
});

describe('EsVersionPrecheck', () => {
  beforeEach(() => {
    versionService.setup(MOCK_VERSION_STRING);
  });

  it('returns a 403 when callCluster fails with a 403', async () => {
    const fakeCall = jest.fn().mockRejectedValue({ statusCode: 403 });

    const ctx = xpackMocks.createRequestHandlerContext();
    ctx.core.elasticsearch.client = {
      asInternalUser: {
        ...ctx.core.elasticsearch.client.asInternalUser,
        nodes: {
          ...ctx.core.elasticsearch.client.asInternalUser.nodes,
          info: fakeCall,
        },
      },
      asCurrentUser: ctx.core.elasticsearch.client.asCurrentUser,
    };

    const result = await esVersionCheck(ctx, kibanaResponseFactory);
    expect(result).toHaveProperty('status', 403);
  });

  it('returns a 426 message w/ allNodesUpgraded = false when nodes are not on same version', async () => {
    const ctx = xpackMocks.createRequestHandlerContext();
    ctx.core.elasticsearch.client = {
      asInternalUser: {
        ...ctx.core.elasticsearch.client.asInternalUser,
        nodes: {
          ...ctx.core.elasticsearch.client.asInternalUser.nodes,
          info: jest.fn().mockResolvedValue({
            body: {
              nodes: {
                node1: { version: currentVersion.raw },
                node2: { version: new SemVer(currentVersion.raw).inc('major').raw },
              },
            },
          }),
        },
      },
      asCurrentUser: ctx.core.elasticsearch.client.asCurrentUser,
    };

    const result = await esVersionCheck(ctx, kibanaResponseFactory);
    expect(result).toHaveProperty('status', 426);
    expect(result).toHaveProperty('payload.attributes.allNodesUpgraded', false);
  });

  it('returns a 426 message w/ allNodesUpgraded = true when nodes are on next version', async () => {
    const ctx = xpackMocks.createRequestHandlerContext();
    ctx.core.elasticsearch.client = {
      asInternalUser: {
        ...ctx.core.elasticsearch.client.asInternalUser,
        nodes: {
          ...ctx.core.elasticsearch.client.asInternalUser.nodes,
          info: jest.fn().mockResolvedValue({
            body: {
              nodes: {
                node1: { version: new SemVer(currentVersion.raw).inc('major').raw },
                node2: { version: new SemVer(currentVersion.raw).inc('major').raw },
              },
            },
          }),
        },
      },
      asCurrentUser: ctx.core.elasticsearch.client.asCurrentUser,
    };

    const result = await esVersionCheck(ctx, kibanaResponseFactory);
    expect(result).toHaveProperty('status', 426);
    expect(result).toHaveProperty('payload.attributes.allNodesUpgraded', true);
  });

  it('returns undefined when nodes are on same version', async () => {
    const ctx = xpackMocks.createRequestHandlerContext();
    ctx.core.elasticsearch.client = {
      asInternalUser: {
        ...ctx.core.elasticsearch.client.asInternalUser,
        nodes: {
          ...ctx.core.elasticsearch.client.asInternalUser.nodes,
          info: jest.fn().mockResolvedValue({
            body: {
              nodes: {
                node1: { version: currentVersion.raw },
                node2: { version: currentVersion.raw },
              },
            },
          }),
        },
      },
      asCurrentUser: ctx.core.elasticsearch.client.asCurrentUser,
    };

    await expect(esVersionCheck(ctx, kibanaResponseFactory)).resolves.toBe(undefined);
  });
});
