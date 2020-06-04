/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../src/core/server';
import { ArtifactConstants } from '../../../exceptions';

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
      manifestResp[manifest.attributes.name] = {
        [manifest.attributes.name]: {
          url: `${allowlistBaseRoute}/download/${manifest.attributes.sha256}`,
          sha256: manifest.attributes.sha256,
          size: manifest.attributes.size, // TODO add size
        },
      };
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
    type: ArtifactConstants.SAVED_OBJECT_TYPE,
    fields: ['name', 'schemaVersion', 'sha256', 'encoding', 'size', 'created'],
    search: schemaVersion,
    searchFields: ['schemaVersion'],
    sortField: 'created',
    sortOrder: 'asc',
  });

  return manifestResp;
}
