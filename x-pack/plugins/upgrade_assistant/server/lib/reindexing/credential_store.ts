/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import stringify from 'json-stable-stringify';

import { KibanaRequest, Logger } from 'src/core/server';

import { SecurityPluginStart } from '../../../../security/server';
import { ReindexSavedObject, ReindexStatus } from '../../../common/types';

export type Credential = Record<string, any>;

// Generates a stable hash for the reindex operation's current state.
const getHash = (reindexOp: ReindexSavedObject) => {
  // Remove reindexOptions from the SO attributes as it creates an unstable hash
  // This needs further investigation, see: https://github.com/elastic/kibana/issues/123752
  const { reindexOptions, ...attributes } = reindexOp.attributes;
  return createHash('sha256')
    .update(stringify({ id: reindexOp.id, ...attributes }))
    .digest('base64');
};

// Returns a base64-encoded API key string or undefined
const getApiKey = async ({
  request,
  security,
  reindexOpId,
  apiKeysMap,
}: {
  request: KibanaRequest;
  security: SecurityPluginStart;
  reindexOpId: string;
  apiKeysMap: Map<string, string>;
}): Promise<string | undefined> => {
  try {
    const apiKeyResult = await security.authc.apiKeys.grantAsInternalUser(request, {
      name: `ua_reindex_${reindexOpId}`,
      role_descriptors: {},
      metadata: {
        description:
          'Created by the Upgrade Assistant for a reindex operation; this can be safely deleted after Kibana is upgraded.',
      },
    });

    if (apiKeyResult) {
      const { api_key: apiKey, id } = apiKeyResult;
      // Store each API key per reindex operation so that we can later invalidate it when the reindex operation is complete
      apiKeysMap.set(reindexOpId, id);
      // Returns the base64 encoding of `id:api_key`
      // This can be used when sending a request with an "Authorization: ApiKey xxx" header
      return Buffer.from(`${id}:${apiKey}`).toString('base64');
    }
  } catch (error) {
    // There are a few edge cases were granting an API key could fail,
    // in which case we fall back to using the requestor's credentials in memory
    return undefined;
  }
};

const invalidateApiKey = async ({
  apiKeyId,
  security,
  log,
}: {
  apiKeyId: string;
  security?: SecurityPluginStart;
  log: Logger;
}) => {
  try {
    await security?.authc.apiKeys.invalidateAsInternalUser({ ids: [apiKeyId] });
  } catch (error) {
    // Swallow error if there's a problem invalidating API key
    log.debug(`Error invalidating API key for id ${apiKeyId}: ${error.message}`);
  }
};

/**
 * An in-memory cache for user credentials to be used for reindexing operations. When looking up
 * credentials, the reindex operation must be in the same state it was in when the credentials
 * were stored. This prevents any tampering of the .kibana index by an unpriviledged user from
 * affecting the reindex process.
 */
export interface CredentialStore {
  get(reindexOp: ReindexSavedObject): Credential | undefined;
  set(params: {
    reindexOp: ReindexSavedObject;
    request: KibanaRequest;
    security?: SecurityPluginStart;
  }): Promise<void>;
  update(params: {
    reindexOp: ReindexSavedObject;
    security?: SecurityPluginStart;
    credential: Credential;
  }): Promise<void>;
  clear(): void;
}

export const credentialStoreFactory = (logger: Logger): CredentialStore => {
  const credMap = new Map<string, Credential>();
  const apiKeysMap = new Map<string, string>();
  const log = logger.get('credential_store');

  return {
    get(reindexOp: ReindexSavedObject) {
      return credMap.get(getHash(reindexOp));
    },

    async set({
      reindexOp,
      request,
      security,
    }: {
      reindexOp: ReindexSavedObject;
      request: KibanaRequest;
      security?: SecurityPluginStart;
    }) {
      const areApiKeysEnabled = (await security?.authc.apiKeys.areAPIKeysEnabled()) ?? false;

      if (areApiKeysEnabled) {
        const apiKey = await getApiKey({
          request,
          security: security!,
          reindexOpId: reindexOp.id,
          apiKeysMap,
        });

        if (apiKey) {
          credMap.set(getHash(reindexOp), {
            ...request.headers,
            authorization: `ApiKey ${apiKey}`,
          });
          return;
        }
      }

      // Set the requestor's credentials in memory if apiKeys are not enabled
      credMap.set(getHash(reindexOp), request.headers);
    },

    async update({
      reindexOp,
      security,
      credential,
    }: {
      reindexOp: ReindexSavedObject;
      security?: SecurityPluginStart;
      credential: Credential;
    }) {
      // If the reindex operation is completed...
      if (reindexOp.attributes.status === ReindexStatus.completed) {
        // ...and an API key is being used, invalidate it
        const apiKeyId = apiKeysMap.get(reindexOp.id);
        if (apiKeyId) {
          await invalidateApiKey({ apiKeyId, security, log });
          apiKeysMap.delete(reindexOp.id);
          return;
        }
      }

      // Otherwise, re-associate the credentials
      credMap.set(getHash(reindexOp), credential);
    },

    clear() {
      for (const k of credMap.keys()) {
        credMap.delete(k);
      }
    },
  };
};
