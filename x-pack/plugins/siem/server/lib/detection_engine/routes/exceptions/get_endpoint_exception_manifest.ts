/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, RequestHandlerContext, APICaller } from 'kibana/server';
import { createHash } from 'crypto';
import { SavedObjectsClient } from 'kibana/public';

const allowlistBaseRoute: string = '/api/endpoint/allowlist';

/**
 * Registers the exception list route to enable sensors to retrieve a manifest of available lists
 */
export function getEndpointExceptionManifest(router: IRouter) {
  router.get(
    {
      path: '/api/endpoint/manifest',
      validate: {},
      options: { authRequired: true },
    },
    handleWhitelistManifest
  );
}

/**
 * Handles the GET request for whitelist manifest
 */
async function handleWhitelistManifest(context, req, res) {
  try {
    const manifest = await getWhitelistManifest(context);
    return res.ok({ body: manifest });
  } catch (err) {
    return res.internalError({ body: err });
  }
}

/**
 * Creates the manifest for the whitelist
 */
async function getWhitelistManifest(ctx) {
  const soClient: SavedObjectsClient = ctx.core.savedObjects.client;

  const manifestResp = soClient.find({
    type: 'siem-exceptions-artifact',
    fields: ['name', 'schemaVersion', 'sha256', 'encoding', 'created'],
  });

  return manifestResp;
}
