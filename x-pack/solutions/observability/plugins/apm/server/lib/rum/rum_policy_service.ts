/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { Logger, SavedObjectsClientContract, SavedObjectsType } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { AgentlessRumClient, AgentlessRumPolicy } from '@kbn/fleet-plugin/server';

export const RUM_POLICY_TYPE = 'apm-rum-policy';
const RUM_POLICY_ID = 'default';
const MAX_TOKENS = 10;
const MAX_ORIGINS = 100;

export const rumSettingsSchema = schema.object({
  enabled: schema.boolean(),
  allowed_origins: schema.arrayOf(schema.string({ minLength: 1, maxLength: 2048 }), {
    maxSize: MAX_ORIGINS,
  }),
});

export const rumPolicySavedObject: SavedObjectsType = {
  name: RUM_POLICY_TYPE,
  namespaceType: 'agnostic',
  hidden: true,
  mappings: { dynamic: false, properties: {} },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: schema.object({
          revision: schema.number({ min: 1, max: Number.MAX_SAFE_INTEGER }),
          deleted: schema.boolean(),
          ...rumSettingsSchema.getPropSchemas(),
          client_tokens: schema.arrayOf(
            schema.object({
              id: schema.string(),
              sha256: schema.string(),
              created_at: schema.string(),
            }),
            { maxSize: MAX_TOKENS }
          ),
        }),
      },
    },
  },
};

type RumSettings = Pick<AgentlessRumPolicy, 'enabled' | 'allowed_origins'>;

const emptyPolicy: AgentlessRumPolicy = {
  revision: 0,
  deleted: true,
  enabled: false,
  allowed_origins: [],
  client_tokens: [],
};

export class RumPolicyService {
  constructor(
    private readonly savedObjects: SavedObjectsClientContract,
    private readonly agentless: AgentlessRumClient,
    private readonly logger: Logger
  ) {}

  private async read() {
    try {
      return await this.savedObjects.get<AgentlessRumPolicy>(RUM_POLICY_TYPE, RUM_POLICY_ID);
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw error;
      }
    }
  }

  public async getSettings() {
    const {
      enabled,
      allowed_origins: allowedOrigins,
      client_tokens: tokens,
    } = (await this.read())?.attributes ?? emptyPolicy;

    return {
      enabled,
      allowed_origins: allowedOrigins,
      client_tokens: tokens.map(({ id, created_at: createdAt }) => ({ id, created_at: createdAt })),
    };
  }

  public async updateSettings(settings: RumSettings): Promise<boolean> {
    const origins = new Set(settings.allowed_origins);
    if (
      origins.size !== settings.allowed_origins.length ||
      settings.allowed_origins.some((origin) => {
        if (origin === '*') {
          return false;
        }
        if (origin.includes('*')) {
          return true;
        }
        try {
          const url = new URL(origin);
          return (
            (url.protocol !== 'http:' && url.protocol !== 'https:') ||
            (!url.hostname.startsWith('[') && !/^[a-z0-9._-]+$/.test(url.hostname)) ||
            url.origin !== origin
          );
        } catch {
          return true;
        }
      })
    ) {
      throw Boom.badRequest('Allowed origins must be unique HTTP(S) origins or a literal wildcard');
    }
    await this.save((policy) => {
      if (
        !policy.deleted &&
        policy.enabled === settings.enabled &&
        policy.allowed_origins.length === origins.size &&
        policy.allowed_origins.every((origin) => origins.has(origin))
      ) {
        return policy;
      }
      return { ...policy, ...settings, deleted: false };
    });
    return this.publishLatest();
  }

  public async createToken() {
    const saved = this.read();
    if (((await saved)?.attributes.client_tokens.length ?? 0) >= MAX_TOKENS) {
      throw Boom.conflict('RUM policies allow up to 10 client tokens');
    }
    const { token, ...record } = await this.agentless.mintToken().catch(() => {
      throw Boom.badGateway('Could not mint a RUM token');
    });
    await this.save((policy) => {
      if (policy.client_tokens.length >= MAX_TOKENS) {
        throw Boom.conflict('RUM policies allow up to 10 client tokens');
      }
      return { ...policy, deleted: false, client_tokens: [...policy.client_tokens, record] };
    }, saved);
    return {
      id: record.id,
      created_at: record.created_at,
      token,
      published: await this.publishLatest(),
    };
  }

  public async revokeToken(id: string): Promise<boolean> {
    await this.save((policy) => {
      const tokens = policy.client_tokens.filter((token) => token.id !== id);
      return tokens.length === policy.client_tokens.length
        ? policy
        : { ...policy, client_tokens: tokens };
    });
    return this.publishLatest();
  }

  public async deleteSettings(): Promise<boolean> {
    await this.save((policy) => (policy.deleted ? policy : { ...emptyPolicy }));
    return this.publishLatest();
  }

  public async publishLatest(): Promise<boolean> {
    try {
      // A newer revision may have won after a concurrent save.
      const saved = await this.read();
      if (saved) {
        await this.agentless.publish(saved.attributes);
      }
      return true;
    } catch {
      this.logger.warn('Could not publish the saved RUM policy. Task Manager will retry.');
      return false;
    }
  }

  private async save(
    change: (policy: AgentlessRumPolicy) => AgentlessRumPolicy,
    initial = this.read()
  ): Promise<void> {
    let saved = await initial;
    for (let attempt = 0; attempt < 5; attempt++) {
      const policy = saved?.attributes ?? emptyPolicy;
      const next = change(policy);
      if (next === policy) {
        return;
      }
      if (policy.revision >= Number.MAX_SAFE_INTEGER) {
        throw Boom.conflict('RUM policy revision limit reached');
      }
      next.revision = policy.revision + 1;
      try {
        if (saved) {
          if (!saved.version) {
            throw new Error('Saved RUM policy has no Saved Object version');
          }
          await this.savedObjects.update(RUM_POLICY_TYPE, RUM_POLICY_ID, next, {
            version: saved.version,
          });
        } else {
          await this.savedObjects.create(RUM_POLICY_TYPE, next, { id: RUM_POLICY_ID });
        }
        return;
      } catch (error) {
        if (!SavedObjectsErrorHelpers.isConflictError(error)) {
          throw error;
        }
      }
      if (attempt < 4) {
        saved = await this.read();
      }
    }
    throw Boom.conflict('The RUM policy changed while it was being saved');
  }
}
