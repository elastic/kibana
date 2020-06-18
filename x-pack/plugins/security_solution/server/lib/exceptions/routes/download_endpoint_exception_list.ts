/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, KibanaResponse } from 'src/core/server';
import { validate } from '../../../../common/validate';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { ExceptionsCache } from '../cache';
import { ArtifactConstants } from '../manifest';
import {
  ArtifactDownloadSchema,
  DownloadArtifactRequestParamsSchema,
  downloadArtifactRequestParamsSchema,
  downloadArtifactResponseSchema,
} from '../schemas';

const allowlistBaseRoute: string = '/api/endpoint/allowlist';

/**
 * Registers the exception list route to enable sensors to download a compressed  allowlist
 */
export function downloadEndpointExceptionListRoute(router: IRouter, cache: ExceptionsCache) {
  router.get(
    {
      path: `${allowlistBaseRoute}/download/{artifactName}/{sha256}`,
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

      // TODO: authenticate api key
      // https://github.com/elastic/kibana/issues/69329

      const validateResponse = (resp: object): KibanaResponse => {
        const [validated, errors] = validate(resp, downloadArtifactResponseSchema);
        if (errors != null) {
          return res.internalError({ body: errors });
        } else {
          return res.ok(validated);
        }
      };

      const cacheKey = `${req.params.artifactName}-${req.params.sha256}`;
      const cacheResp = cache.get(cacheKey);

      if (cacheResp) {
        // CACHE HIT
        const downloadResponse = {
          body: Buffer.from(cacheResp, 'binary'),
          headers: {
            'content-encoding': 'xz',
            'content-disposition': `attachment; filename=${req.params.artifactName}.xz`,
          },
        };
        return validateResponse(downloadResponse);
      } else {
        // CACHE MISS
        return soClient
          .get<ArtifactDownloadSchema>(
            ArtifactConstants.SAVED_OBJECT_TYPE,
            `${req.params.artifactName}`
          )
          .then((artifact) => {
            const outBuffer = Buffer.from(artifact.attributes.body, 'binary');

            if (artifact.attributes.sha256 !== req.params.sha256) {
              return res.notFound({
                body: `No artifact matching sha256: ${req.params.sha256} for type ${req.params.artifactName}`,
              });
            }

            // Hashes match... populate cache
            cache.set(cacheKey, artifact.attributes.body);

            const downloadResponse = {
              body: outBuffer,
              headers: {
                'content-encoding': 'xz',
                'content-disposition': `attachment; filename=${artifact.attributes.name}.xz`,
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
