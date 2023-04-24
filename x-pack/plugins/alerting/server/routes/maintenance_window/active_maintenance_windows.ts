/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../../lib';
import { verifyAccessAndContext, rewriteMaintenanceWindowRes } from '../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../types';
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../common';

export const activeMaintenanceWindowsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window/_active`,
      validate: {},
      options: {
        tags: [`access:${MAINTENANCE_WINDOW_API_PRIVILEGES.READ_MAINTENANCE_WINDOW}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();
        const result = await maintenanceWindowClient.getActiveMaintenanceWindows({});

        return res.ok({
          body: result.map((maintenanceWindow) => rewriteMaintenanceWindowRes(maintenanceWindow)),
        });
      })
    )
  );
};
