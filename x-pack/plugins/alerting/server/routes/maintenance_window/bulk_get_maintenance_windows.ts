/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState } from '../../lib';
import { verifyAccessAndContext, rewriteMaintenanceWindowRes, RewriteResponseCase } from '../lib';
import {
  AlertingRequestHandlerContext,
  INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH,
} from '../../types';
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../common';
import { BulkGetResult } from '../../maintenance_window_client/methods/bulk_get';

const bodySchema = schema.object({
  ids: schema.arrayOf(schema.string()),
});

export const rewriteBodyResponse: RewriteResponseCase<BulkGetResult> = (result: BulkGetResult) => ({
  maintenance_windows: result.maintenanceWindows.map((mw) => rewriteMaintenanceWindowRes(mw)),
  errors: result.errors.map((error) => ({
    id: error.id,
    error: error.error,
    message: error.message,
    status_code: error.statusCode,
  })),
});

export const bulkGetMaintenanceWindowRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/_bulk_get`,
      validate: {
        body: bodySchema,
      },
      options: {
        tags: [`access:${MAINTENANCE_WINDOW_API_PRIVILEGES.READ_MAINTENANCE_WINDOW}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();
        const { ids } = req.body;
        const result = await maintenanceWindowClient.bulkGet({ ids });

        return res.ok({
          body: rewriteBodyResponse(result),
        });
      })
    )
  );
};
