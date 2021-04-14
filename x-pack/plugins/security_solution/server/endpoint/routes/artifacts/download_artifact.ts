/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, HttpResponseOptions, IKibanaResponse } from 'src/core/server';
import LRU from 'lru-cache';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { authenticateAgentWithAccessToken } from '../../../../../fleet/server/services/agents/authenticate';
import { LIMITED_CONCURRENCY_ENDPOINT_ROUTE_TAG } from '../../../../common/endpoint/constants';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import {
  DownloadArtifactRequestParamsSchema,
  downloadArtifactRequestParamsSchema,
  downloadArtifactResponseSchema,
} from '../../schemas/artifacts';
import { EndpointAppContext } from '../../types';

const allowlistBaseRoute: string = '/api/endpoint/artifacts';

/**
 * Registers the artifact download route to enable sensors to download an allowlist artifact
 */
export function registerDownloadArtifactRoute(
  router: IRouter,
  endpointContext: EndpointAppContext,
  cache: LRU<string, Buffer>
) {
  router.get(
    {
      path: `${allowlistBaseRoute}/download/{identifier}/{sha256}`,
      validate: {
        params: buildRouteValidation<
          typeof downloadArtifactRequestParamsSchema,
          DownloadArtifactRequestParamsSchema
        >(downloadArtifactRequestParamsSchema),
      },
      options: { tags: [LIMITED_CONCURRENCY_ENDPOINT_ROUTE_TAG] },
    },
    async (context, req, res) => {
      const logger = endpointContext.logFactory.get('download_artifact');

      // The ApiKey must be associated with an enrolled Fleet agent
      try {
        await authenticateAgentWithAccessToken(
          context.core.elasticsearch.client.asInternalUser,
          req
        );
      } catch (err) {
        if ((err.isBoom ? err.output.statusCode : err.statusCode) === 401) {
          return res.unauthorized();
        } else {
          return res.notFound();
        }
      }

      const validateDownload = (await endpointContext.config()).validateArtifactDownloads;
      const buildAndValidateResponse = (artName: string, body: Buffer): IKibanaResponse => {
        const artifact: HttpResponseOptions = {
          body,
          headers: {
            'content-encoding': 'identity',
            'content-disposition': `attachment; filename=${artName}.zz`,
          },
        };

        if (validateDownload && !downloadArtifactResponseSchema.is(artifact)) {
          throw new Error('Artifact failed to validate.');
        } else {
          return res.ok(artifact);
        }
      };

      const id = `${req.params.identifier}-${req.params.sha256}`;
      const cacheResp = cache.get(id);

      if (cacheResp) {
        logger.debug(`Cache HIT artifact ${id}`);
        return buildAndValidateResponse(req.params.identifier, cacheResp);
      } else {
        logger.debug(`Cache MISS artifact ${id}`);

        const artifact = await endpointContext.service
          .getManifestManager()
          ?.getArtifactsClient()
          .getArtifact(id);

        if (!artifact) {
          return res.notFound({ body: `No artifact found for ${id}` });
        }

        const bodyBuffer = Buffer.from(artifact.body, 'base64');
        cache.set(id, bodyBuffer);
        return buildAndValidateResponse(artifact.identifier, bodyBuffer);
      }
    }
  );
}
