/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IRouter,
  SavedObjectsClientContract,
  HttpResponseOptions,
  IKibanaResponse,
  SavedObject,
} from 'src/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { authenticateAgentWithAccessToken } from '../../../../../ingest_manager/server/services/agents/authenticate';
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

const allowlistBaseRoute: string = '/api/endpoint/artifacts';

/**
 * Registers the exception list route to enable sensors to download an allowlist artifact
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
    },
    async (context, req, res) => {
      let scopedSOClient: SavedObjectsClientContract;
      const logger = endpointContext.logFactory.get('download_exception_list');

      // The ApiKey must be associated with an enrolled Fleet agent
      try {
        scopedSOClient = endpointContext.service.getScopedSavedObjectsClient(req);
        await authenticateAgentWithAccessToken(scopedSOClient, req);
      } catch (err) {
        if ((err.isBoom ? err.output.statusCode : err.statusCode) === 401) {
          return res.unauthorized();
        } else {
          return res.notFound();
        }
      }

      const buildAndValidateResponse = (artName: string, body: Buffer): IKibanaResponse => {
        const artifact: HttpResponseOptions = {
          body,
          headers: {
            'content-encoding': 'identity',
            'content-disposition': `attachment; filename=${artName}.zz`,
          },
        };

        const [validated, errors] = validate(artifact, downloadArtifactResponseSchema);
        if (errors !== null || validated === null) {
          return res.internalError({ body: errors! });
        } else {
          return res.ok((validated as unknown) as HttpResponseOptions);
        }
      };

      const id = `${req.params.identifier}-${req.params.sha256}`;
      const cacheResp = cache.get(id);

      if (cacheResp) {
        logger.debug(`Cache HIT artifact ${id}`);
        return buildAndValidateResponse(req.params.identifier, cacheResp);
      } else {
        logger.debug(`Cache MISS artifact ${id}`);
        return scopedSOClient
          .get<InternalArtifactSchema>(ArtifactConstants.SAVED_OBJECT_TYPE, id)
          .then((artifact: SavedObject<InternalArtifactSchema>) => {
            const body = Buffer.from(artifact.attributes.body, 'base64');
            cache.set(id, body);
            return buildAndValidateResponse(artifact.attributes.identifier, body);
          })
          .catch((err) => {
            if (err?.output?.statusCode === 404) {
              return res.notFound({ body: `No artifact found for ${id}` });
            } else {
              return res.internalError({ body: err });
            }
          });
      }
    }
  );
}
