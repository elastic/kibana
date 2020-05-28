/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, RequestHandlerContext, APICaller } from 'kibana/server';
import { createHash } from 'crypto';

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
  const hash = createHash('sha256')
    .update(whitelistArtifactCache.toString('utf8'), 'utf8')
    .digest('hex');

  const manifest = {
    schemaVersion: '1.0.0',
    manifestVersion: '1.0.0',
    artifacts: {
      'global-whitelist': {
        url: `${allowlistBaseRoute}/download/${hash}`,
        sha256: hash,
        size: whitelistArtifactCache.byteLength,
        encoding: 'xz',
      },
    },
  };
  return manifest;
}