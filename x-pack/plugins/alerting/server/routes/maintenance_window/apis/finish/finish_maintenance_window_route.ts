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
import { MaintenanceWindow } from '../../../../application/maintenance_window/types';
import {
  finishParamsSchemaV1,
  FinishMaintenanceWindowRequestParamsV1,
  FinishMaintenanceWindowResponseV1,
} from '../../../../../common/routes/maintenance_window/apis/finish';
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../../../common';
import { transformMaintenanceWindowToResponseV1 } from '../../transforms';

export const finishMaintenanceWindowRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/{id}/_finish`,
      validate: {
        params: finishParamsSchemaV1,
      },
      options: {
        access: 'internal',
        tags: [`access:${MAINTENANCE_WINDOW_API_PRIVILEGES.WRITE_MAINTENANCE_WINDOW}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const params: FinishMaintenanceWindowRequestParamsV1 = req.params;

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();

        const maintenanceWindow: MaintenanceWindow = await maintenanceWindowClient.finish({
          id: params.id,
        });

        const response: FinishMaintenanceWindowResponseV1 = {
          body: transformMaintenanceWindowToResponseV1(maintenanceWindow),
        };

        return res.ok(response);
      })
    )
  );
};
