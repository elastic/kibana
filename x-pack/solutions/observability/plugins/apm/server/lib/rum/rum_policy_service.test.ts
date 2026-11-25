/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { AgentlessRumClient, AgentlessRumPolicy } from '@kbn/fleet-plugin/server';
import { RUM_POLICY_TYPE, RumPolicyService, rumPolicySavedObject } from './rum_policy_service';

const tokenRecord = {
  id: 'rum_client',
  sha256: 'a'.repeat(64),
  created_at: '2026-11-25T10:00:00Z',
};

const settings = { enabled: true, allowed_origins: ['https://example.org'] };
const initialPolicy: AgentlessRumPolicy = {
  ...settings,
  revision: 1,
  deleted: false,
  client_tokens: [tokenRecord],
};

const storedPolicy = (attributes: AgentlessRumPolicy, version: string) => ({
  type: RUM_POLICY_TYPE,
  id: 'default',
  attributes,
  references: [],
  version,
});

describe('RumPolicyService', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let savedObjects: ReturnType<typeof savedObjectsClientMock.create>;
  let agentless: jest.Mocked<AgentlessRumClient>;
  let service: RumPolicyService;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    savedObjects = savedObjectsClientMock.create();
    agentless = { mintToken: jest.fn(), publish: jest.fn() };
    service = new RumPolicyService(savedObjects, agentless, logger);
  });

  it('persists the digest before publishing and returns the token even when publishing fails', async () => {
    const token = 'rum_client.rum_secret';
    const notFound = SavedObjectsErrorHelpers.createGenericNotFoundError(
      RUM_POLICY_TYPE,
      'default'
    );
    const mintedPolicy = {
      ...initialPolicy,
      enabled: false,
      allowed_origins: [],
    };
    const saved = storedPolicy(mintedPolicy, 'version-1');
    savedObjects.get.mockRejectedValueOnce(notFound);
    savedObjects.get.mockResolvedValue(saved);
    savedObjects.create.mockResolvedValue(saved);
    agentless.mintToken.mockResolvedValue({ ...tokenRecord, token });
    agentless.publish.mockRejectedValueOnce(new Error('Agentless unavailable'));

    await expect(service.createToken()).resolves.toEqual({
      id: tokenRecord.id,
      created_at: tokenRecord.created_at,
      token,
      published: false,
    });
    expect(savedObjects.create).toHaveBeenCalledWith(RUM_POLICY_TYPE, mintedPolicy, {
      id: 'default',
    });
    expect(savedObjects.create.mock.invocationCallOrder[0]).toBeLessThan(
      agentless.publish.mock.invocationCallOrder[0]
    );
    expect(JSON.stringify(savedObjects.create.mock.calls)).not.toContain(token);

    await expect(service.publishLatest()).resolves.toBe(true);
    expect(agentless.publish).toHaveBeenNthCalledWith(2, mintedPolicy, { signal: undefined });
    expect(agentless.mintToken).toHaveBeenCalledTimes(1);
    await expect(service.getSettings()).resolves.toEqual({
      enabled: false,
      allowed_origins: [],
      client_tokens: [{ id: tokenRecord.id, created_at: tokenRecord.created_at }],
    });
  });

  it('republishes unchanged settings without incrementing the revision', async () => {
    savedObjects.get.mockResolvedValue(storedPolicy(initialPolicy, 'version-1'));

    await expect(service.updateSettings(settings)).resolves.toBe(true);
    expect(savedObjects.update).not.toHaveBeenCalled();
    expect(agentless.publish).toHaveBeenCalledWith(initialPolicy, { signal: undefined });
  });

  it('rejects minting once the policy has ten tokens', async () => {
    savedObjects.get.mockResolvedValue(
      storedPolicy(
        {
          ...initialPolicy,
          client_tokens: Array.from({ length: 10 }, (_, id) => ({
            ...tokenRecord,
            id: `rum_${id}`,
          })),
        },
        'version-1'
      )
    );

    await expect(service.createToken()).rejects.toThrow(
      'RUM policies allow up to 10 client tokens'
    );
    expect(agentless.mintToken).not.toHaveBeenCalled();
  });

  it('preserves concurrent changes after a Saved Object version conflict', async () => {
    const concurrent = { ...initialPolicy, revision: 2, client_tokens: [] };
    const updated = { ...concurrent, revision: 3, enabled: false };
    savedObjects.get
      .mockResolvedValueOnce(storedPolicy(initialPolicy, 'version-1'))
      .mockResolvedValueOnce(storedPolicy(concurrent, 'version-2'))
      .mockResolvedValueOnce(storedPolicy(updated, 'version-3'));
    savedObjects.update.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createConflictError(RUM_POLICY_TYPE, 'default')
    );

    await expect(service.updateSettings({ ...settings, enabled: false })).resolves.toBe(true);
    expect(savedObjects.update).toHaveBeenLastCalledWith(RUM_POLICY_TYPE, 'default', updated, {
      version: 'version-2',
    });
    expect(agentless.publish).toHaveBeenCalledWith(updated, { signal: undefined });
  });

  it.each([
    {
      action: 'revoke' as const,
      policy: { ...initialPolicy, revision: 2, client_tokens: [] },
    },
    {
      action: 'delete' as const,
      policy: {
        revision: 2,
        enabled: false,
        deleted: true,
        allowed_origins: [],
        client_tokens: [],
      },
    },
  ])('publishes the full saved policy on $action', async ({ action, policy }) => {
    savedObjects.get
      .mockResolvedValueOnce(storedPolicy(initialPolicy, 'version-1'))
      .mockResolvedValueOnce(storedPolicy(policy, 'version-2'));

    await expect(
      action === 'revoke' ? service.revokeToken(tokenRecord.id) : service.deleteSettings()
    ).resolves.toBe(true);
    expect(savedObjects.update).toHaveBeenCalledWith(RUM_POLICY_TYPE, 'default', policy, {
      version: 'version-1',
    });
    expect(agentless.publish).toHaveBeenCalledWith(policy, { signal: undefined });
  });

  it.each([
    ['https://example.org/path'],
    ['https://*.example.org'],
    ['https://example{test}.org'],
    ['https://example.org', 'https://example.org'],
    ['ftp://example.org'],
    ['https://example.org/'],
    ['https://Example.org'],
    ['https://example.org:443'],
  ])('rejects invalid origins before saving', async (...allowedOrigins) => {
    await expect(
      service.updateSettings({ enabled: true, allowed_origins: allowedOrigins })
    ).rejects.toThrow('Allowed origins must be unique HTTP(S) origins or a literal wildcard');
    expect(savedObjects.create).not.toHaveBeenCalled();
    expect(savedObjects.update).not.toHaveBeenCalled();
  });

  it('republishes when a newer revision is saved during publishing', async () => {
    const newer = { ...initialPolicy, revision: 2, client_tokens: [] };
    savedObjects.get
      .mockResolvedValueOnce(storedPolicy(initialPolicy, 'version-1'))
      .mockResolvedValueOnce(storedPolicy(newer, 'version-2'))
      .mockResolvedValue(storedPolicy(newer, 'version-2'));

    await expect(service.publishLatest()).resolves.toBe(true);
    expect(agentless.publish).toHaveBeenCalledTimes(2);
    expect(agentless.publish).toHaveBeenLastCalledWith(newer, { signal: undefined });
  });

  it('stops after a bounded number of attempts while the policy keeps changing', async () => {
    let revision = 0;
    savedObjects.get.mockImplementation(async () =>
      storedPolicy({ ...initialPolicy, revision: ++revision }, `version-${revision}`)
    );

    await expect(service.publishLatest()).resolves.toBe(false);
    expect(agentless.publish).toHaveBeenCalledTimes(3);
  });

  it('does not publish once the signal is aborted', async () => {
    const controller = new AbortController();
    savedObjects.get.mockImplementation(async () => {
      controller.abort();
      return storedPolicy(initialPolicy, 'version-1');
    });

    await expect(service.publishLatest(controller.signal)).resolves.toBe(false);
    expect(agentless.publish).not.toHaveBeenCalled();
  });

  it('forwards the signal and logs the failure reason', async () => {
    const controller = new AbortController();
    savedObjects.get.mockResolvedValue(storedPolicy(initialPolicy, 'version-1'));
    agentless.publish.mockRejectedValueOnce(new Error('Failed to publish'));

    await expect(service.publishLatest(controller.signal)).resolves.toBe(false);
    expect(agentless.publish).toHaveBeenCalledWith(initialPolicy, { signal: controller.signal });
    expect(logger.warn).toHaveBeenCalledWith(
      'Could not publish the saved RUM policy. Task Manager will retry: Failed to publish'
    );
  });

  it('does not wait for another read once the task is cancelled after publishing', async () => {
    const controller = new AbortController();
    savedObjects.get.mockResolvedValue(storedPolicy(initialPolicy, 'version-1'));
    agentless.publish.mockImplementation(async () => controller.abort());

    await expect(service.publishLatest(controller.signal)).resolves.toBe(false);
    expect(savedObjects.get).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('reads newer policies by ignoring unknown fields at every level', () => {
    const { modelVersions } = rumPolicySavedObject;
    const versions = typeof modelVersions === 'function' ? modelVersions() : modelVersions;
    const { create, forwardCompatibility } = versions?.[1]?.schemas ?? {};
    const newerPolicy = {
      ...initialPolicy,
      future: true,
      client_tokens: [{ ...tokenRecord, label: 'x' }],
    };

    expect(
      typeof forwardCompatibility === 'object' && forwardCompatibility.validate(newerPolicy)
    ).toEqual(initialPolicy);
    expect(() => typeof create === 'object' && create.validate(newerPolicy)).toThrow();
  });

  it.each([['*'], ['http://[::1]:8080'], ['https://example.org:8443']])(
    'accepts the valid origin %s',
    async (origin) => {
      await expect(
        service.updateSettings({ enabled: true, allowed_origins: [origin] })
      ).resolves.toBe(true);
      expect(savedObjects.create).toHaveBeenCalled();
    }
  );

  it('does not bump the revision when revoking an unknown token', async () => {
    savedObjects.get.mockResolvedValue(storedPolicy(initialPolicy, 'version-1'));

    await expect(service.revokeToken('unknown')).resolves.toBe(true);
    expect(savedObjects.update).not.toHaveBeenCalled();
    expect(agentless.publish).toHaveBeenCalledWith(initialPolicy, { signal: undefined });
  });

  it('does not save a deletion when the policy is absent or already deleted', async () => {
    savedObjects.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(RUM_POLICY_TYPE, 'default')
    );
    savedObjects.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(RUM_POLICY_TYPE, 'default')
    );
    await expect(service.deleteSettings()).resolves.toBe(true);

    const deleted = { ...initialPolicy, deleted: true, enabled: false, client_tokens: [] };
    savedObjects.get.mockResolvedValue(storedPolicy(deleted, 'version-1'));
    await expect(service.deleteSettings()).resolves.toBe(true);
    expect(savedObjects.create).not.toHaveBeenCalled();
    expect(savedObjects.update).not.toHaveBeenCalled();
  });

  it('never returns token digests', async () => {
    savedObjects.get.mockResolvedValue(storedPolicy(initialPolicy, 'version-1'));

    const result = await service.getSettings();
    expect(JSON.stringify(result)).not.toContain(tokenRecord.sha256);
  });

  it('returns 502 and saves nothing when minting fails', async () => {
    savedObjects.get.mockResolvedValue(storedPolicy(initialPolicy, 'version-1'));
    agentless.mintToken.mockRejectedValue(new Error('Failed to mint'));

    await expect(service.createToken()).rejects.toMatchObject({ output: { statusCode: 502 } });
    expect(savedObjects.update).not.toHaveBeenCalled();
    expect(savedObjects.create).not.toHaveBeenCalled();
  });

  it('returns 409 after exhausting version conflict retries', async () => {
    savedObjects.get.mockResolvedValue(storedPolicy(initialPolicy, 'version-1'));
    savedObjects.update.mockRejectedValue(
      SavedObjectsErrorHelpers.createConflictError(RUM_POLICY_TYPE, 'default')
    );

    await expect(service.revokeToken(tokenRecord.id)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
    expect(savedObjects.update).toHaveBeenCalledTimes(5);
    expect(agentless.publish).not.toHaveBeenCalled();
  });

  it('returns 409 when the revision limit is reached', async () => {
    savedObjects.get.mockResolvedValue(
      storedPolicy({ ...initialPolicy, revision: Number.MAX_SAFE_INTEGER }, 'version-1')
    );

    await expect(service.revokeToken(tokenRecord.id)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
    expect(savedObjects.update).not.toHaveBeenCalled();
  });
});
