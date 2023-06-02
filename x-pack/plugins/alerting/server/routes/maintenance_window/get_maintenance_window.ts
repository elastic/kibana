/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState } from '../../lib';
import { verifyAccessAndContext, rewriteMaintenanceWindowRes } from '../lib';
import {
  AlertingRequestHandlerContext,
  INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH,
} from '../../types';
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../common';

const paramSchema = schema.object({
  id: schema.string(),
});

export const getMaintenanceWindowRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/{id}`,
      validate: {
        params: paramSchema,
      },
      options: {
        tags: [`access:${MAINTENANCE_WINDOW_API_PRIVILEGES.READ_MAINTENANCE_WINDOW}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();
        const { id } = req.params;
        const maintenanceWindow = await maintenanceWindowClient.get({ id });
        return res.ok({
          body: rewriteMaintenanceWindowRes(maintenanceWindow),
        });
      })
    )
  );
};
