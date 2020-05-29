/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../src/core/server';
import { buildRouteValidation } from '../utils';
import { downloadExceptionListSchema } from '../schemas/download_exception_list_schema';
import { DownloadExceptionListRequestParams } from '../../exceptions/types';

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
      type: 'siem-exceptions-artifact',
      search: req.params.sha256,
      searchFields: ['sha256'],
    });
    if (resp.total > 0) {
      return res.ok({ body: resp.saved_objects[0] });
    } else if (resp.total > 1) {
      context.logger.warn(`Duplicate allowlist entries found: ${req.params.sha256}`);
    } else {
      return res.notFound();
    }
  } catch (err) {
    return res.internalError({ body: err });
  }
}
