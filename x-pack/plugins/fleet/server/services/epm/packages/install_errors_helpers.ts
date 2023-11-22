/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lt } from 'semver';

const MAX_ATTEMPTS_TO_KEEP = 5;

interface FailedInstallAttempts {
  '@timestamp': string;
  target_version: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
}

export function clearLatestFailedAttempts(
  installedVersion: string,
  latestAttempts: FailedInstallAttempts[] = []
) {
  return latestAttempts.filter((attempt) => lt(installedVersion, attempt.target_version));
}

export function addErrorToLatestFailedAttempts({
  error,
  timestamp,
  targetVersion,
  latestAttempts = [],
}: {
  timestamp: string;
  targetVersion: string;
  error: Error;
  latestAttempts?: FailedInstallAttempts[];
}): FailedInstallAttempts[] {
  return [
    {
      '@timestamp': timestamp,
      target_version: targetVersion,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    },
    ...latestAttempts,
  ].slice(0, MAX_ATTEMPTS_TO_KEEP);
}
