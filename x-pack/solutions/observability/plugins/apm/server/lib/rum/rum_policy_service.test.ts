/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { AgentlessRumClient, AgentlessRumPolicy } from '@kbn/fleet-plugin/server';
import { RUM_POLICY_TYPE, RumPolicyService } from './rum_policy_service';

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
  const logger = loggingSystemMock.createLogger();
  let savedObjects: ReturnType<typeof savedObjectsClientMock.create>;
  let agentless: jest.Mocked<AgentlessRumClient>;
  let service: RumPolicyService;

  beforeEach(() => {
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
    expect(agentless.publish).toHaveBeenNthCalledWith(2, mintedPolicy);
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
    expect(agentless.publish).toHaveBeenCalledWith(initialPolicy);
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
    expect(agentless.publish).toHaveBeenCalledWith(updated);
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
    expect(agentless.publish).toHaveBeenCalledWith(policy);
  });

  it.each([
    ['https://example.org/path'],
    ['https://*.example.org'],
    ['https://example{test}.org'],
    ['https://example.org', 'https://example.org'],
  ])('rejects invalid origins before saving', async (...allowedOrigins) => {
    await expect(
      service.updateSettings({ enabled: true, allowed_origins: allowedOrigins })
    ).rejects.toThrow('Allowed origins must be unique HTTP(S) origins or a literal wildcard');
    expect(savedObjects.create).not.toHaveBeenCalled();
    expect(savedObjects.update).not.toHaveBeenCalled();
  });
});
