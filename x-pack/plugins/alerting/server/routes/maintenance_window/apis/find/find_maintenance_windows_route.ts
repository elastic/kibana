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
  INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH,
} from '../../../../types';
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../../../common';
import type { FindMaintenanceWindowsResult } from '../../../../application/maintenance_window/methods/find/types';
import type { FindMaintenanceWindowsResponseV1 } from '../../../../../common/routes/maintenance_window/apis/find';
import { transformMaintenanceWindowToResponseV1 } from '../../transforms';

export const findMaintenanceWindowsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/_find`,
      validate: {},
      options: {
        tags: [`access:${MAINTENANCE_WINDOW_API_PRIVILEGES.READ_MAINTENANCE_WINDOW}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();

        const result: FindMaintenanceWindowsResult = await maintenanceWindowClient.find();

        const response: FindMaintenanceWindowsResponseV1 = {
          body: {
            data: result.data.map((maintenanceWindow) =>
              transformMaintenanceWindowToResponseV1(maintenanceWindow)
            ),
            total: result.data.length,
          },
        };

        return res.ok(response);
      })
    )
  );
};
