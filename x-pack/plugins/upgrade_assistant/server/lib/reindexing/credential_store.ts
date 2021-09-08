/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import stringify from 'json-stable-stringify';

import { KibanaRequest } from 'src/core/server';

import { SecurityPluginStart } from '../../../../security/server';
import { ReindexSavedObject } from '../../../common/types';

export type Credential = Record<string, any>;

/**
 * An in-memory cache for user credentials to be used for reindexing operations. When looking up
 * credentials, the reindex operation must be in the same state it was in when the credentials
 * were stored. This prevents any tampering of the .kibana index by an unpriviledged user from
 * affecting the reindex process.
 */
export interface CredentialStore {
  get(reindexOp: ReindexSavedObject): Credential | undefined;
  set(
    reindexOp: ReindexSavedObject,
    request: KibanaRequest,
    security: SecurityPluginStart
  ): Promise<void>;
  update(reindexOp: ReindexSavedObject, credential: Credential): void;
  clear(): void;
}

export const credentialStoreFactory = (): CredentialStore => {
  const credMap = new Map<string, Credential>();

  // Generates a stable hash for the reindex operation's current state.
  const getHash = (reindexOp: ReindexSavedObject) =>
    createHash('sha256')
      .update(stringify({ id: reindexOp.id, ...reindexOp.attributes }))
      .digest('base64');

  const createApiKey = async (
    request: KibanaRequest,
    security: SecurityPluginStart
  ): Promise<string | undefined> => {
    const apiKeyResult = await security.authc.apiKeys.grantAsInternalUser(request, {
      name: 'ua_reindex_api_key',
      role_descriptors: {},
    });

    if (apiKeyResult) {
      const { api_key: apiKey, id } = apiKeyResult;
      return Buffer.from(`${id}:${apiKey}`).toString('base64');
    }
  };

  // TODO implement
  // const invalidateApiKey = () => {};

  return {
    get(reindexOp: ReindexSavedObject) {
      return credMap.get(getHash(reindexOp));
    },

    async set(
      reindexOp: ReindexSavedObject,
      request: KibanaRequest,
      security: SecurityPluginStart
    ) {
      const areApiKeysEnabled = (await security?.authc?.apiKeys?.areAPIKeysEnabled()) ?? false;
      const apiKey = areApiKeysEnabled && (await createApiKey(request, security));

      if (apiKey) {
        credMap.set(getHash(reindexOp), {
          ...request.headers,
          authorization: `ApiKey ${apiKey}`,
        });
        return;
      }

      // Set the requestor's credentials in memory if apiKeys are not enabled
      credMap.set(getHash(reindexOp), request.headers);
    },

    update(reindexOp: ReindexSavedObject, credential: Credential) {
      credMap.set(getHash(reindexOp), credential);
    },

    clear() {
      for (const k of credMap.keys()) {
        credMap.delete(k);
      }
    },
  };
};
