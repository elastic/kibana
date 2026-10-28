/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { setTimeout } from 'timers/promises';
import { Agent, fetch } from 'undici';

import { schema, type TypeOf } from '@kbn/config-schema';
import type { CoreStart, ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { MOCK_IDP_UIAM_SERVICE_URL, MOCK_IDP_UIAM_SHARED_SECRET } from '@kbn/mock-idp-utils';

export const credentialRecoverySchema = schema.object({
  scenario: schema.oneOf([
    schema.literal('grants'),
    schema.literal('concurrent_grants'),
    schema.literal('scoped'),
    schema.literal('mixed'),
    schema.literal('late'),
    schema.literal('twice'),
    schema.literal('stale_first_after_second_expiry'),
  ]),
  backend: schema.oneOf([schema.literal('es'), schema.literal('uiam')]),
  waitMs: schema.number({ min: 0, max: 70_000 }),
  secondWaitMs: schema.number({ min: 0, max: 70_000, defaultValue: 0 }),
  probeFirst: schema.boolean({ defaultValue: true }),
});

type RecoveryOptions = TypeOf<typeof credentialRecoverySchema>;

interface GrantedKey {
  id: string;
  api_key: string;
  backend: RecoveryOptions['backend'];
}

interface UiamAuthenticationResult {
  api_key_id: string;
  credentials?: { creator?: { type: string; user_id?: number } };
}

interface RecoveryResult {
  keys: Array<Pick<GrantedKey, 'id' | 'backend'>>;
  usernames: string[];
  snapshotExpired: boolean;
  cleanupComplete: boolean;
  headersUnchanged: boolean;
}

/** Waits for every operation before throwing, so cleanup sees all created resources. */
export async function runConcurrentOperations(operations: Array<Promise<void>>): Promise<void> {
  const outcomes = await Promise.allSettled(operations);
  const failure = outcomes.find((outcome) => outcome.status === 'rejected');
  if (failure?.status === 'rejected') {
    throw failure.reason;
  }
}

/** Exercises credential recovery within one incoming request and owns its temporary API keys. */
export class CredentialRecovery {
  private readonly originalHeaders: KibanaRequest['headers'];
  private readonly originalAuthorization: KibanaRequest['headers']['authorization'];
  private readonly clients: ElasticsearchClient[];
  private readonly snapshotClient: ElasticsearchClient;
  private readonly expiryDeadline = Date.now() + 70_000;
  private readonly dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
  private readonly keys: GrantedKey[] = [];
  private readonly usernames: string[] = [];
  private snapshotExpired = false;
  private cleanupComplete = false;

  constructor(
    private readonly core: CoreStart,
    private readonly request: KibanaRequest,
    private readonly options: RecoveryOptions
  ) {
    this.originalHeaders = request.headers;
    this.originalAuthorization = request.headers.authorization;

    // Instantiate all transports before expiry, so each one captures the initial credential.
    this.clients = Array.from({ length: 3 }, () => this.createScopedClient());

    // This plain header snapshot cannot renew. Its 401 proves the initial token expired.
    this.snapshotClient = core.elasticsearch.client.asScoped({
      headers: { ...request.headers },
    }).asCurrentUser;
  }

  async run(): Promise<void> {
    const { scenario, waitMs, secondWaitMs, probeFirst } = this.options;

    await setTimeout(waitMs);
    if (probeFirst) {
      await this.waitForTokenExpiry();
    }

    const [firstClient, secondClient, staleClient] = this.clients;
    switch (scenario) {
      case 'grants':
        await this.grantApiKey();
        await this.grantApiKey();
        break;

      case 'concurrent_grants':
        await runConcurrentOperations([this.grantApiKey(), this.grantApiKey(), this.grantApiKey()]);
        break;

      case 'scoped':
        await runConcurrentOperations(this.clients.map((client) => this.authenticate(client)));
        break;

      case 'mixed':
        await runConcurrentOperations([
          this.authenticate(firstClient),
          this.authenticate(secondClient),
          this.grantApiKey(),
          this.grantApiKey(),
        ]);
        break;

      case 'late':
        await this.authenticate(firstClient);
        await this.authenticate(secondClient);
        await this.grantApiKey();
        break;

      case 'twice': {
        await runConcurrentOperations([this.authenticate(firstClient), this.grantApiKey()]);
        const renewedClient = this.createScopedClient();

        await setTimeout(secondWaitMs);
        await runConcurrentOperations([this.authenticate(renewedClient), this.grantApiKey()]);
        await this.authenticate(staleClient);
        break;
      }

      case 'stale_first_after_second_expiry': {
        await runConcurrentOperations([this.authenticate(firstClient), this.grantApiKey()]);
        const renewedClient = this.createScopedClient();

        await setTimeout(secondWaitMs);
        // The untouched client must renew again before any caller checks the newer token.
        await this.authenticate(staleClient);
        await runConcurrentOperations([this.authenticate(renewedClient), this.grantApiKey()]);
        break;
      }
    }
  }

  async cleanup(): Promise<void> {
    try {
      const esKeyIds = this.keys.filter(({ backend }) => backend === 'es').map(({ id }) => id);
      const uiamKeys = this.keys.filter(({ backend }) => backend === 'uiam');

      await runConcurrentOperations([
        this.invalidateEsKeys(esKeyIds),
        ...uiamKeys.map(async ({ id, api_key: apiKey }) => {
          const response = await this.callUiam(
            `api-keys/${encodeURIComponent(id)}`,
            apiKey,
            'DELETE'
          );
          await response.arrayBuffer();
        }),
      ]);
      this.cleanupComplete = true;
    } finally {
      await this.dispatcher.close();
    }
  }

  getResult(): RecoveryResult {
    return {
      keys: this.keys.map(({ id, backend }) => ({ id, backend })),
      usernames: this.usernames,
      snapshotExpired: this.snapshotExpired,
      cleanupComplete: this.cleanupComplete,
      headersUnchanged:
        this.request.headers === this.originalHeaders &&
        this.request.headers.authorization === this.originalAuthorization,
    };
  }

  private createScopedClient() {
    return this.core.elasticsearch.client.asScoped(this.request).asCurrentUser;
  }

  private async authenticate(client: ElasticsearchClient) {
    const { username } = await client.security.authenticate();
    this.usernames.push(username);
  }

  private async waitForTokenExpiry() {
    while (true) {
      try {
        await this.snapshotClient.security.authenticate();
      } catch (error) {
        if (
          error instanceof errors.ResponseError &&
          error.statusCode === 401 &&
          (error.body?.error?.reason === 'token expired' ||
            error.body?.error?.caused_by?.authentication_error_code === '0x7E0116')
        ) {
          this.snapshotExpired = true;
          return;
        }

        throw error;
      }

      if (Date.now() >= this.expiryDeadline) {
        throw new Error('The captured credential did not expire within the test window');
      }

      await setTimeout(250);
    }
  }

  private async grantApiKey() {
    if (this.options.backend === 'uiam') {
      await this.grantUiamApiKey();
      return;
    }

    const key = await this.core.security.authc.apiKeys.grantAsInternalUser(
      this.request,
      { name: `credential-recovery-${this.request.uuid}`, role_descriptors: {} },
      { refresh: false }
    );
    if (!key) {
      throw new Error('The ES grant backend is unavailable');
    }

    this.keys.push({ ...key, backend: 'es' });

    const credential = Buffer.from(`${key.id}:${key.api_key}`).toString('base64');
    const client = this.core.elasticsearch.client.asScoped({
      headers: { authorization: `ApiKey ${credential}` },
    }).asCurrentUser;
    await this.authenticate(client);
  }

  private async grantUiamApiKey() {
    const key = await this.core.security.authc.apiKeys.uiam?.grant(this.request, {
      name: `credential-recovery-${this.request.uuid}`,
    });
    if (!key) {
      throw new Error('The UIAM grant backend is unavailable');
    }

    this.keys.push({ ...key, backend: 'uiam' });

    const client = this.core.elasticsearch.client.asScoped({
      headers: { authorization: `ApiKey ${key.api_key}` },
    }).asCurrentUser;
    const principal = await client.security.authenticate();
    if (principal.username !== key.id) {
      throw new Error('UIAM key authenticated as a different key principal');
    }

    // Elasticsearch reports the key ID for UIAM keys. Check the creator through UIAM itself.
    const response = await this.callUiam(
      'authentication/_authenticate?with_limited_by=true',
      key.api_key,
      'POST'
    );
    const info = (await response.json()) as UiamAuthenticationResult;
    const creator = info.credentials?.creator;
    if (
      info.api_key_id !== key.id ||
      creator?.type !== 'user' ||
      !Number.isSafeInteger(creator.user_id)
    ) {
      throw new Error('UIAM did not identify the granting user as the key creator');
    }

    this.usernames.push(String(creator.user_id));
  }

  private async invalidateEsKeys(ids: string[]) {
    if (ids.length === 0) {
      return;
    }

    const result = await this.core.security.authc.apiKeys.invalidateAsInternalUser({ ids });
    if (!result || result.error_count) {
      throw new Error('Native ES key cleanup failed');
    }
  }

  private async callUiam(path: string, credential: string, method: 'POST' | 'DELETE') {
    const response = await fetch(`${MOCK_IDP_UIAM_SERVICE_URL}/uiam/api/v1/${path}`, {
      method,
      dispatcher: this.dispatcher,
      headers: {
        Authorization: `ApiKey ${credential}`,
        'x-client-authentication': MOCK_IDP_UIAM_SHARED_SECRET,
        'Content-Type': 'application/json',
      },
      ...(method === 'POST' ? { body: '{}' } : {}),
    });
    if (!response.ok) {
      await response.arrayBuffer();
      throw new Error(`UIAM ${method} ${path} failed: ${response.status}`);
    }

    return response;
  }
}
