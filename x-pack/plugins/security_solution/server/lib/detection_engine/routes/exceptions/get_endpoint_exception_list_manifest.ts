/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../src/core/server';
import { ArtifactConstants } from '../../../exceptions';
import { buildRouteValidation } from '../utils';
import { GetExceptionListManifestRequestParams } from '../../exceptions/types';
import { getExceptionListManifestSchema } from '../schemas/get_endpoint_exception_manifest_schema';

const allowlistBaseRoute: string = '/api/endpoint/allowlist';

export interface Manifest {
  schemaVersion: string;
  manifestVersion: string;
  artifacts: Artifacts;
}
export interface Artifacts {
  [key: string]: Artifact;
}
export interface Artifact {
  url: string;
  sha256: string;
  size: number;
}

/**
 * Registers the exception list route to enable sensors to retrieve a manifest of available lists
 */
export function getEndpointExceptionListManifest(router: IRouter) {
  router.get(
    {
      path: `${allowlistBaseRoute}/manifest/{manifestVersion}/{schemaVersion}`,
      validate: {
        params: buildRouteValidation<GetExceptionListManifestRequestParams>(
          getExceptionListManifestSchema
        ),
      },
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
    if (req.params.manifestVersion !== '1.0.0') {
      return res.badRequest('invalid manifest version');
    }

    const resp = await getAllowlistManifest(context, req.params.schemaVersion);
    if (resp.saved_objects.length === 0) {
      return res.notFound({ body: `No manifest found for version ${req.params.schemaVersion}` });
    }
    const manifestResp: Manifest = {
      schemaVersion: req.params.schemaVersion,
      manifestVersion: '1.0.0', // TODO hardcode?
      artifacts: {},
    };

    // transform and validate response
    for (const manifest of resp.saved_objects) {
      manifestResp.artifacts[manifest.attributes.name] = {
        url: `${allowlistBaseRoute}/download/${manifest.attributes.sha256}`,
        sha256: manifest.attributes.sha256,
        size: manifest.attributes.size,
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
async function getAllowlistManifest(ctx, manifestVersion: string, schemaVersion: string) {
  const soClient = ctx.core.savedObjects.client;

  // TODO page
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
