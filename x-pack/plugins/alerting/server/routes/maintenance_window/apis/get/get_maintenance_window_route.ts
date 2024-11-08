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
import { MaintenanceWindow } from '../../../../application/maintenance_window/types';
import {
  getParamsSchemaV1,
  GetMaintenanceWindowRequestParamsV1,
  GetMaintenanceWindowResponseV1,
} from '../../../../../common/routes/maintenance_window/apis/get';
import { transformMaintenanceWindowToResponseV1 } from '../../transforms';

export const getMaintenanceWindowRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/{id}`,
      validate: {
        params: getParamsSchemaV1,
      },
      options: {
        access: 'internal',
        tags: [`access:${MAINTENANCE_WINDOW_API_PRIVILEGES.READ_MAINTENANCE_WINDOW}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();

        const params: GetMaintenanceWindowRequestParamsV1 = req.params;

        const maintenanceWindow: MaintenanceWindow = await maintenanceWindowClient.get({
          id: params.id,
        });

        const response: GetMaintenanceWindowResponseV1 = {
          body: transformMaintenanceWindowToResponseV1(maintenanceWindow),
        };
        return res.ok(response);
      })
    )
  );
};
