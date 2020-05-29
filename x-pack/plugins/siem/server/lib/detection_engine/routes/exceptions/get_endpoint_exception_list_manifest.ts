/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../src/core/server';

const allowlistBaseRoute: string = '/api/endpoint/allowlist';

/**
 * Registers the exception list route to enable sensors to retrieve a manifest of available lists
 */
export function getEndpointExceptionListManifest(router: IRouter) {
  router.get(
    {
      path: `${allowlistBaseRoute}/manifest`,
      validate: {},
      options: { authRequired: true },
    },
    handleAllowlistManifest
  );
}

/**
 * Handles the GET request for whitelist manifest
 */
async function handleAllowlistManifest(context, req, res) {
  try {
    const manifest = await getAllowlistManifest(context);
    // TODO: transform and validate response
    return res.ok({ body: manifest });
  } catch (err) {
    return res.internalError({ body: err });
  }
}

/**
 * Creates the manifest for the whitelist
 */
async function getAllowlistManifest(ctx) {
  const soClient = ctx.core.savedObjects.client;

  const manifestResp = soClient.find({
    type: 'siem-exceptions-artifact',
    fields: ['name', 'schemaVersion', 'sha256', 'encoding', 'created'],
  });

  return manifestResp;
}
