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
import {
  findMaintenanceWindowsRequestQuerySchemaV1,
  findMaintenanceWindowsResponseBodySchemaV1,
  type FindMaintenanceWindowsRequestQueryV1,
} from '../../../../../common/routes/maintenance_window/apis/find';
import {
  transformFindMaintenanceWindowParamsV1,
  transformFindMaintenanceWindowResponseV1,
} from './transforms';

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
            body: () => findMaintenanceWindowsResponseBodySchemaV1,
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
      security: {
        authz: {
          requiredPrivileges: [`${MAINTENANCE_WINDOW_API_PRIVILEGES.READ_MAINTENANCE_WINDOW}`],
        },
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const query: FindMaintenanceWindowsRequestQueryV1 = req.query || {};
        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();

        const options = transformFindMaintenanceWindowParamsV1(query);
        const findResult: FindMaintenanceWindowsResult = await maintenanceWindowClient.find(
          options
        );
        const responseBody: FindMaintenanceWindowsResponseV1 =
          transformFindMaintenanceWindowResponseV1(findResult);

        return res.ok({ body: responseBody });
      })
    )
  );
};
