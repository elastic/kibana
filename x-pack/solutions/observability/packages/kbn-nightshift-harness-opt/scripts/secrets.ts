/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

const SUITE_VAULT_CONFIG = Path.join(
  REPO_ROOT,
  'x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/vault/config.json'
);
const EVALS_VAULT_CONFIG = Path.join(
  REPO_ROOT,
  'x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json'
);

const readJson = (path: string, hint: string): Record<string, unknown> => {
  if (!Fs.existsSync(path)) {
    throw new Error(`${path} is missing; retrieve it with ${hint}`);
  }
  return JSON.parse(Fs.readFileSync(path, 'utf8')) as Record<string, unknown>;
};

export interface OrcaUser {
  url: string;
  username: string;
  password: string;
}

/** The ORCA eval user, which mints one document-level-security key per telemetry cutoff. */
export const readOrcaUser = (): OrcaUser => {
  const config = readJson(
    SUITE_VAULT_CONFIG,
    '`node x-pack/platform/packages/shared/kbn-evals/scripts/vault/retrieve_secrets.js --vault dev --suite nightshift-investigations`'
  );
  const orca = config.nightshiftOrcaEs as Partial<OrcaUser> | undefined;
  if (!orca?.url || !orca.username || !orca.password) {
    throw new Error(`${SUITE_VAULT_CONFIG} has no nightshiftOrcaEs.{url,username,password}`);
  }
  return { url: orca.url.replace(/\/$/, ''), username: orca.username, password: orca.password };
};

/** The Golden evals Kibana, which stores the ORCA releases. */
export const readEvaluationsKibana = (): { url: string; apiKey: string } => {
  const config = readJson(
    EVALS_VAULT_CONFIG,
    '`node x-pack/platform/packages/shared/kbn-evals/scripts/vault/retrieve_secrets.js --vault dev`'
  );
  const kbn = config.evaluationsKbn as { url?: string; apiKey?: string } | undefined;
  if (!kbn?.url || !kbn.apiKey) {
    throw new Error(`${EVALS_VAULT_CONFIG} has no evaluationsKbn.{url,apiKey}`);
  }
  return { url: kbn.url.replace(/\/$/, ''), apiKey: kbn.apiKey };
};

/**
 * The suite's `resolveOrcaEsCredentials` reads the Scout hook's exports; this process plays the
 * hook, so the same functions work unchanged.
 */
export const exportOrcaUserForSuite = (user: OrcaUser): void => {
  process.env.NIGHTSHIFT_ORCA_ES_URL = user.url;
  process.env.NIGHTSHIFT_ORCA_ES_USERNAME = user.username;
  process.env.NIGHTSHIFT_ORCA_ES_PASSWORD = user.password;
  process.env.NIGHTSHIFT_CONNECTOR_SET = 'orcabench';
};
