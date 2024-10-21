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
import {
  findMaintenanceWindowsRequestQuerySchemaV1,
  findMaintenanceWindowsResponseSchemaV1,
  type FindMaintenanceWindowsRequestQueryV1,
} from '../../../../../common/routes/maintenance_window/apis/find';

export const findMaintenanceWindowsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/_find`,
      validate: {
        request: {
          query: findMaintenanceWindowsRequestQuerySchemaV1,
        },
        response: {
          200: {
            body: () => findMaintenanceWindowsResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema or parameters.',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
        },
      },
      options: {
        access: 'internal',
        tags: [`access:${MAINTENANCE_WINDOW_API_PRIVILEGES.READ_MAINTENANCE_WINDOW}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const { page, per_page: perPage }: FindMaintenanceWindowsRequestQueryV1 = req.query; // rewrite transform

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();

        const result: FindMaintenanceWindowsResult = await maintenanceWindowClient.find({
          page,
          perPage,
        });

        const response: { body: FindMaintenanceWindowsResponseV1 } = {
          body: {
            data: result.data.map((maintenanceWindow) =>
              transformMaintenanceWindowToResponseV1(maintenanceWindow)
            ),
            total: result.data.length,
            page: result.page,
            per_page: result.perPage,
          },
        };

        return res.ok(response);
      })
    )
  );
};
