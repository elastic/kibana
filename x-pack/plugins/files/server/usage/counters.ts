/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getCounters(prefix: string) {
  return {
    DELETE: `${prefix}_delete`,
    DELETE_ERROR: `${prefix}_delete_error`,

    UNSHARE: `${prefix}_unshare`,
    UNSHARE_ERROR: `${prefix}_unshare_error`,

    DOWNLOAD: `${prefix}_download`,
    DOWNLOAD_ERROR: `${prefix}_download_error`,
  };
}

export type Counters = keyof ReturnType<typeof getCounters>;
