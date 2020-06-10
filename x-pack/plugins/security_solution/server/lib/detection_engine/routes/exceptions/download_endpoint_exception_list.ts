/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../src/core/server';
import { ArtifactConstants } from '../../../exceptions';
import { DownloadExceptionListRequestParams } from '../../exceptions/types';
import { buildRouteValidation } from '../utils';
import { downloadExceptionListSchema } from '../schemas/download_exception_list_schema';

const allowlistBaseRoute: string = '/api/endpoint/allowlist';

/**
 * Registers the exception list route to enable sensors to download a compressed  allowlist
 */
export function downloadEndpointExceptionList(router: IRouter) {
  router.get(
    {
      path: `${allowlistBaseRoute}/download/{sha256}`,
      validate: {
        params: buildRouteValidation<DownloadExceptionListRequestParams>(
          downloadExceptionListSchema
        ),
      },
      options: { authRequired: true },
    },
    handleEndpointExceptionDownload
  );
}

/**
 * Handles the GET request for downloading the allowlist
 */
async function handleEndpointExceptionDownload(context, req, res) {
  try {
    const soClient = context.core.savedObjects.client;
    const resp = await soClient.find({
      type: ArtifactConstants.SAVED_OBJECT_TYPE,
      search: req.params.sha256,
      searchFields: ['sha256'],
    });
    if (resp.total > 0) {
      const artifact = resp.saved_objects[0];
      const outBuffer = Buffer.from(artifact.attributes.body, 'binary');

      return res.ok({
        body: outBuffer,
        headers: {
          'content-encoding': 'xz',
          'content-disposition': `attachment; filename=${artifact.attributes.name}.xz`,
        },
      });
    } else {
      return res.notFound();
    }
  } catch (err) {
    return res.internalError({ body: err });
  }
}
