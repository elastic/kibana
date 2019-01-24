/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import { Request } from 'hapi';
import { ReindexSavedObject } from 'x-pack/plugins/upgrade_assistant/common/types';

export type Credential = Request['headers'];

/**
 * An in-memory cache for user credentials to be used for reindexing operations. When looking up
 * credentials, the reindex operation must be in the same state it was in when the credentials
 * were stored. This prevents any tampering of the .kibana index by an unpriviledged user from
 * affecting the reindex process.
 */
export interface CredentialStore {
  get(reindexOp: ReindexSavedObject): Credential | undefined;
  set(reindexOp: ReindexSavedObject, credential: Credential): void;
  clear(): void;
}

export const credentialStoreFactory = (): CredentialStore => {
  const credMap = new Map<string, Credential>();

  // Generates a stable hash for the reindex operation's current state.
  const getHash = (reindexOp: ReindexSavedObject) => {
    let sortedAttrsStr = `${reindexOp.id}\n`;

    // Sort keys so we can get a stable serialized string.
    sortedAttrsStr += Object.keys(reindexOp.attributes)
      .sort()
      .map(k => `${k}: ${JSON.stringify(reindexOp.attributes[k])}`)
      .join('\n');

    return createHash('md5')
      .update(sortedAttrsStr)
      .digest('base64');
  };

  return {
    get(reindexOp: ReindexSavedObject) {
      return credMap.get(getHash(reindexOp));
    },

    set(reindexOp: ReindexSavedObject, credential: Credential) {
      credMap.set(getHash(reindexOp), credential);
    },

    clear() {
      for (const k of credMap.keys()) {
        credMap.delete(k);
      }
    },
  };
};
