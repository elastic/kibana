/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Nightshift service accounts. There is one of each per deployment, shared by every space:
 * - `agent` runs investigations, their sandbox tools and their Agent Builder hooks.
 * - `automations` runs automation workflows, which start investigations.
 */
export type NightshiftServiceAccountKind = 'agent' | 'automations';

export const NIGHTSHIFT_SERVICE_ACCOUNT_KINDS: readonly NightshiftServiceAccountKind[] = [
  'agent',
  'automations',
];

/** The name each account is found and created by. */
export const getNightshiftServiceAccountName = (kind: NightshiftServiceAccountKind): string =>
  `nightshift_${kind}`;

/**
 * The role an account holds. Nightshift never creates or changes these roles. On Serverless they
 * are elasticsearch-controller predefined roles, whose names must start with `_`. On stateful they
 * are named like the account and created by whoever sets up the deployment (see the README). The
 * roles cover every space; the per-space bound workflows decide where an account acts.
 */
export const getNightshiftRoleName = (
  kind: NightshiftServiceAccountKind,
  { isServerless }: { isServerless: boolean }
): string => {
  const name = getNightshiftServiceAccountName(kind);
  return isServerless ? `_${name}` : name;
};

/**
 * The ids of the accounts a space is set up with, as the service accounts backend assigned them:
 * `kibana/<name>` on stateful, a generated id on Serverless.
 */
export type NightshiftServiceAccountIds = Record<NightshiftServiceAccountKind, string>;
