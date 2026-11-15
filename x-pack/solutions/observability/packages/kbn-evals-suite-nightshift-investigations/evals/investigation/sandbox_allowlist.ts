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
  type PutSandboxAllowlistRequest,
} from '@kbn/nightshift-investigations-plugin/common';
import { getDatasetEnvironment, type DatasetIdentity } from './custom_context';

/**
 * Egress rules that let `git` clone and fetch one public GitHub repository over smart HTTP, with or
 * without the `.git` suffix. The rest of github.com (issues, pull requests, the web UI) stays
 * blocked.
 */
export const gitCloneRules = (repository: string): string[] =>
  [repository, `${repository}.git`].flatMap((path) => [
    `allow https github.com GET /${path}/info/refs`,
    `allow https github.com POST /${path}/git-upload-pack`,
  ]);

/** The repository `ORCA_CUSTOM_CONTEXT` tells the agent to clone. */
export const ORCA_SANDBOX_ALLOWLIST: readonly string[] = gitCloneRules(
  'open-telemetry/opentelemetry-demo'
);

/**
 * The repositories `CUSTOMER0_CUSTOM_CONTEXT` tells the agent to clone. Only git traffic is allowed,
 * so the agent cannot read the issues or pull requests the retrospective guardrail rules out.
 */
export const CUSTOMER0_SANDBOX_ALLOWLIST: readonly string[] = [
  'elastic/kibana',
  'elastic/elasticsearch',
].flatMap(gitCloneRules);

/**
 * The sandbox egress rules an investigation dataset runs with. The sandbox reaches only these and
 * its connectors' hosts, so without them the repositories its custom context points at are refused.
 */
export const getDatasetSandboxAllowlist = (dataset: DatasetIdentity): readonly string[] => {
  switch (getDatasetEnvironment(dataset)) {
    case 'customer0':
      return CUSTOMER0_SANDBOX_ALLOWLIST;
    case 'orca':
      return ORCA_SANDBOX_ALLOWLIST;
    default:
      return [];
  }
};

/** The space's current sandbox egress rules, in stored order. */
export const readSandboxAllowlist = async (fetch: HttpHandler): Promise<string[]> =>
  (await fetch<GetSandboxAllowlistResponse>(SANDBOX_ALLOWLIST_API_PATH)).hosts;

/** Replaces the space's sandbox egress rules with exactly these. */
export const replaceSandboxAllowlist = async (
  fetch: HttpHandler,
  hosts: readonly string[]
): Promise<void> => {
  if (hosts.length === 0 && (await readSandboxAllowlist(fetch)).length === 0) return;
  const body: PutSandboxAllowlistRequest = { hosts: [...hosts] };
  await fetch(SANDBOX_ALLOWLIST_API_PATH, { method: 'PUT', body: JSON.stringify(body) });
};
