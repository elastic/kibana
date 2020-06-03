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
      path: `${allowlistBaseRoute}/manifest/{schemaVersion}`,
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
    const resp = await getAllowlistManifest(context, req.params.schemaVersion);
    const manifestResp = {};

    // transform and validate response
    for (const manifest of resp.saved_objects) {
      if (!manifestResp[manifest.name]) {
        manifestResp[manifest.name] = {
          [manifest.name]: {
            url: `${allowlistBaseRoute}/download/${manifest.sha256}`,
            sha256: manifest.sha256,
            size: manifest.size,
          },
        };
      }
    }

    return res.ok({ body: manifestResp });
  } catch (err) {
    return res.internalError({ body: err });
  }
}

/**
 * Creates the manifest for the whitelist
 */
async function getAllowlistManifest(ctx, schemaVersion) {
  const soClient = ctx.core.savedObjects.client;

  const manifestResp = soClient.find({
    type: 'siem-exceptions-artifact', // TODO: use exported const
    fields: ['name', 'schemaVersion', 'sha256', 'encoding', 'size', 'created'],
    search: schemaVersion,
    searchFields: ['schemaVersion'],
    sortField: 'updated_at',
    sortOrder: 'desc',
  });

  return manifestResp;
}
