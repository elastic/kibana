/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import {
  AlertingRequestHandlerContext,
  INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH,
} from '../../../../types';
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../../../common';

import { MaintenanceWindow } from '../../../../application/maintenance_window/types';
import { GetActiveMaintenanceWindowsResponseV1 } from '../../../schemas/maintenance_window/apis/get_active';
import { transformMaintenanceWindowToResponseV1 } from '../../transforms';

export const getActiveMaintenanceWindowsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH,
      validate: {},
      options: {
        tags: [`access:${MAINTENANCE_WINDOW_API_PRIVILEGES.READ_MAINTENANCE_WINDOW}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        // We do not want to throw for this route because other solutions
        // will be using it to determine whether or not they should
        // display a callout in their rules list.
        try {
          licenseState.ensureLicenseForMaintenanceWindow();
        } catch (e) {
          return res.ok({
            body: [],
          });
        }
        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();
        const maintenanceWindows: MaintenanceWindow[] =
          await maintenanceWindowClient.getActiveMaintenanceWindows();

        const response: GetActiveMaintenanceWindowsResponseV1 = {
          body: maintenanceWindows.map((maintenanceWindow) =>
            transformMaintenanceWindowToResponseV1(maintenanceWindow)
          ),
        };

        return res.ok(response);
      })
    )
  );
};
