/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getCounters(fileKind: string) {
  return {
    DELETE: `delete:${fileKind}`,
    DELETE_ERROR: `delete:error:${fileKind}`,

    SHARE: `$unshare:${fileKind}`,
    SHARE_ERROR: `unshare:error:${fileKind}`,

    UNSHARE: `unshare:${fileKind}`,
    UNSHARE_ERROR: `unshare:error:${fileKind}`,

    DOWNLOAD: `download:${fileKind}`,
    DOWNLOAD_ERROR: `download:error:${fileKind}`,
  };
}

export type Counters = keyof ReturnType<typeof getCounters>;
