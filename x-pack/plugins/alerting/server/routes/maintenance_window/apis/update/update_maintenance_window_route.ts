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
  updateBodySchemaV1,
  updateParamsSchemaV1,
  UpdateMaintenanceWindowRequestBodyV1,
  UpdateMaintenanceWindowRequestParamsV1,
  UpdateMaintenanceWindowResponseV1,
} from '../../../../../common/routes/maintenance_window/apis/update';
import { transformUpdateBodyV1 } from './transforms';
import { transformMaintenanceWindowToResponseV1 } from '../../transforms';

export const updateMaintenanceWindowRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/{id}`,
      validate: {
        body: updateBodySchemaV1,
        params: updateParamsSchemaV1,
      },
      security: {
        authz: {
          requiredPrivileges: [`${MAINTENANCE_WINDOW_API_PRIVILEGES.WRITE_MAINTENANCE_WINDOW}`],
        },
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const body: UpdateMaintenanceWindowRequestBodyV1 = req.body;

        const params: UpdateMaintenanceWindowRequestParamsV1 = req.params;

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();

        const maintenanceWindow: MaintenanceWindow = await maintenanceWindowClient.update({
          id: params.id,
          data: transformUpdateBodyV1(body),
        });

        const response: UpdateMaintenanceWindowResponseV1 = {
          body: transformMaintenanceWindowToResponseV1(maintenanceWindow),
        };

        return res.ok(response);
      })
    )
  );
};
