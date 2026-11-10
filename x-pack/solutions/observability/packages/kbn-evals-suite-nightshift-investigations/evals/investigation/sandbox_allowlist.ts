/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import {
  SANDBOX_ALLOWLIST_API_PATH,
  type GetSandboxAllowlistResponse,
} from '@kbn/nightshift-investigations-plugin/common';

/**
 * Hosts a `git clone` of a public GitHub repository needs. The sandbox's egress proxy refuses
 * every host a space has not allowed, so without these the source code the custom context points
 * the agent at (the ORCA demo, Kibana, Elasticsearch) fails with `CONNECT tunnel failed, 403`.
 */
export const GITHUB_SOURCE_HOSTS: readonly string[] = [
  'github.com',
  'codeload.github.com',
  'objects.githubusercontent.com',
  'raw.githubusercontent.com',
];

/** The egress hosts a dataset's investigations need: GitHub when its custom context names code. */
export const getDatasetSandboxHosts = (customContext: readonly string[]): readonly string[] =>
  customContext.some((snippet) => snippet.includes('github.com')) ? GITHUB_SOURCE_HOSTS : [];

/**
 * Adds `hosts` to the space's sandbox egress allowlist, as an admin would on the Nightshift
 * settings page. Existing entries stay; nothing is written when every host is already allowed.
 */
export const ensureSandboxHosts = async (
  fetch: HttpHandler,
  hosts: readonly string[]
): Promise<void> => {
  if (hosts.length === 0) return;
  const current = await fetch<GetSandboxAllowlistResponse>(SANDBOX_ALLOWLIST_API_PATH);
  const missing = hosts.filter((host) => !current.hosts.includes(host));
  if (missing.length === 0) return;
  await fetch(SANDBOX_ALLOWLIST_API_PATH, {
    method: 'PUT',
    body: JSON.stringify({ hosts: [...current.hosts, ...missing] }),
  });
};
