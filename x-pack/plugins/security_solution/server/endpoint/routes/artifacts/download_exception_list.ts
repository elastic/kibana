/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { validate } from '../../../../common/validate';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { ArtifactConstants, ExceptionsCache } from '../../lib/artifacts';
import {
  DownloadArtifactRequestParamsSchema,
  downloadArtifactRequestParamsSchema,
  downloadArtifactResponseSchema,
  InternalArtifactSchema,
} from '../../schemas/artifacts';
import { EndpointAppContext } from '../../types';

const allowlistBaseRoute: string = '/api/endpoint/allowlist';

/**
 * Registers the exception list route to enable sensors to download a compressed  allowlist
 */
export function registerDownloadExceptionListRoute(
  router: IRouter,
  endpointContext: EndpointAppContext,
  cache: ExceptionsCache
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
      options: { tags: [] },
    },
    async (context, req, res) => {
      const soClient = context.core.savedObjects.client;
      const logger = endpointContext.logFactory.get('download_exception_list');

      // TODO: authenticate api key
      // https://github.com/elastic/kibana/issues/69329
      // PR: https://github.com/elastic/kibana/pull/69650

      const validateResponse = (resp: object): object => {
        const [validated, errors] = validate(resp, downloadArtifactResponseSchema);
        if (errors != null) {
          return res.internalError({ body: errors });
        } else {
          return res.ok(validated);
        }
      };

      const id = `${req.params.identifier}-${req.params.sha256}`;
      const cacheResp = cache.get(id);

      if (cacheResp) {
        // CACHE HIT
        logger.debug(`Cache HIT artifact ${id}`);
        const downloadResponse = {
          body: Buffer.from(cacheResp, 'binary'),
          headers: {
            'content-encoding': 'xz',
            'content-disposition': `attachment; filename=${req.params.identifier}.xz`,
          },
        };
        return validateResponse(downloadResponse);
      } else {
        // CACHE MISS
        logger.debug(`Cache MISS artifact ${id}`);
        return soClient
          .get<InternalArtifactSchema>(ArtifactConstants.SAVED_OBJECT_TYPE, id)
          .then((artifact) => {
            const outBuffer = Buffer.from(artifact.attributes.body, 'binary');
            cache.set(id, artifact.attributes.body);

            const downloadResponse = {
              body: outBuffer,
              headers: {
                'content-encoding': 'xz',
                'content-disposition': `attachment; filename=${artifact.attributes.identifier}.xz`,
              },
            };
            return validateResponse(downloadResponse);
          })
          .catch((err) => {
            return res.internalError({ body: err });
          });
      }
    }
  );
}
