/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState } from '../lib';
import { verifyAccessAndContext, rewriteMaintenanceWindowRes } from './lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../common';

const bodySchema = schema.object({
  filter: schema.maybe(schema.string()),
});

export const findMaintenanceWindowsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window/_find`,
      validate: {
        body: bodySchema,
      },
      options: {
        tags: [`access:${MAINTENANCE_WINDOW_API_PRIVILEGES.READ_MAINTENANCE_WINDOW}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();
        const maintenanceWindows = await maintenanceWindowClient.find(req.body);

        return res.ok({
          body: maintenanceWindows.data.map((data) => rewriteMaintenanceWindowRes(data)),
        });
      })
    )
  );
};
