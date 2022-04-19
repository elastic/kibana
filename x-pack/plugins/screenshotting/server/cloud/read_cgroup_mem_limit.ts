/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';

function tryReadFile(path: string): undefined | string {
  try {
    return fs.readFileSync(path).toString();
  } catch (e) {
    return undefined;
  }
}

const cgroupMemLimitPaths = [
  '/sys/fs/cgroup/memory/memory.limit_in_bytes',
  '/sys/fs/cgroup/memory.max',
];

/**
 * Cloud guarantees that memory limits will be enforced by cgroups. `os.totalmem` does
 * not currently read memory values respecting cgroups.
 *
 * Until we are able to get the actual instance size from Cloud we must rely on reading
 * these cgroup files.
 *
 * If successful it will return the memory limit in bytes.
 *
 * Taken from https://github.com/adobe/node-cgroup-metrics/blob/f43d6cf8a4a71d19c81c15bd4c3478583392cb8a/lib/memory.js#L36
 */
export function readMemoryLimit(): undefined | number {
  for (const path of cgroupMemLimitPaths) {
    const fileContents = tryReadFile(path);
    if (!fileContents) continue;
    const limit = parseInt(fileContents.trim(), 10);
    if (isNaN(limit)) continue;
    return limit;
  }
  return undefined;
}
