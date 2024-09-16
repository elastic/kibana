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
  createBodySchemaV1,
  CreateMaintenanceWindowRequestBodyV1,
  CreateMaintenanceWindowResponseV1,
} from '../../../schemas/maintenance_window/apis/create';
import { transformCreateBodyV1 } from './transforms';
import { transformMaintenanceWindowToResponseV1 } from '../../transforms';

export const createMaintenanceWindowRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH,
      validate: {
        body: createBodySchemaV1,
      },
      options: {
        tags: [`access:${MAINTENANCE_WINDOW_API_PRIVILEGES.WRITE_MAINTENANCE_WINDOW}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const body: CreateMaintenanceWindowRequestBodyV1 = req.body;

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();

        const maintenanceWindow: MaintenanceWindow = await maintenanceWindowClient.create({
          data: transformCreateBodyV1(body),
        });

        const response: CreateMaintenanceWindowResponseV1 = {
          body: transformMaintenanceWindowToResponseV1(maintenanceWindow),
        };

        return res.ok(response);
      })
    )
  );
};
