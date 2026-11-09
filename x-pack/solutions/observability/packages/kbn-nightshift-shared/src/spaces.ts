/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

/**
 * Nightshift runs in one space per deployment: the default space. Its service accounts, bound
 * workflows and Agent Builder agents are deployment-wide identities, so enabling it in a second
 * space would rebind them and take Nightshift away from the space that already uses it.
 */
export const NIGHTSHIFT_SUPPORTED_SPACE_ID = DEFAULT_SPACE_ID;

/** True in the only space where Nightshift is shown, enabled and runnable. */
export const isNightshiftSupportedSpace = (spaceId: string | undefined): boolean =>
  spaceId === NIGHTSHIFT_SUPPORTED_SPACE_ID;

/** Shared wording for every server-side refusal outside the default space. */
export const NIGHTSHIFT_UNSUPPORTED_SPACE_MESSAGE = `Nightshift is only available in the "${NIGHTSHIFT_SUPPORTED_SPACE_ID}" space.`;

/**
 * Whether a route endpoint must be refused outside the Nightshift space.
 *
 * Writes are gated, because they are what binds deployment-wide identities — service accounts,
 * workflows and agents — to a space. Reads stay open everywhere, so a space set up on an earlier
 * build can still be looked at, and `exemptEndpoints` — `'<METHOD> <path>'`, the same shape as
 * `endpoint` — keeps the few writes that undo such a setup reachable there as well.
 */
export const isNightshiftSpaceGatedEndpoint = (
  endpoint: string,
  exemptEndpoints: ReadonlySet<string> = new Set()
): boolean => {
  const [method] = endpoint.split(' ');
  return method !== 'GET' && !exemptEndpoints.has(endpoint);
};
