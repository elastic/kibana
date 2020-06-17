/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../src/core/server';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { ArtifactConstants } from '../task';
import { DownloadArtifactReqParamsSchema, downloadArtifactReqParamsSchema } from '../schemas';

const allowlistBaseRoute: string = '/api/endpoint/allowlist';

/**
 * Registers the exception list route to enable sensors to download a compressed  allowlist
 */
export function downloadEndpointExceptionListRoute(router: IRouter) {
  router.get(
    {
      path: `${allowlistBaseRoute}/download/{artifactName}/{sha256}`,
      validate: {
        params: buildRouteValidation<
          typeof downloadArtifactReqParamsSchema,
          DownloadArtifactReqParamsSchema
        >(downloadArtifactReqParamsSchema),
      },
      options: { tags: [] },
    },
    handleEndpointExceptionDownload
  );
}

/**
 * Handles the GET request for downloading the allowlist
 */
async function handleEndpointExceptionDownload(context, req, res) {
  // TODO: api key validation
  const soClient = context.core.savedObjects.client;

  soClient
    .get({
      type: ArtifactConstants.SAVED_OBJECT_TYPE,
      id: `${req.params.artifactName}-${req.params.sha256}`,
    })
    .then((artifact) => {
      const outBuffer = Buffer.from(artifact.attributes.body, 'binary');

      // TODO: validate response before returning
      return res.ok({
        body: outBuffer,
        headers: {
          'content-encoding': 'xz',
          'content-disposition': `attachment; filename=${artifact.attributes.name}.xz`,
        },
      });
    })
    .catch((err) => {
      return res.internalError({ body: err });
    });
}
