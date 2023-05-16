/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState } from '../../lib';
import {
  verifyAccessAndContext,
  rRuleSchema,
  RewriteRequestCase,
  rewriteMaintenanceWindowRes,
} from '../lib';
import {
  AlertingRequestHandlerContext,
  INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH,
} from '../../types';
import { MaintenanceWindowCreateBody, MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../common';

const bodySchema = schema.object({
  title: schema.string(),
  duration: schema.number(),
  r_rule: rRuleSchema,
});

export const rewriteQueryReq: RewriteRequestCase<MaintenanceWindowCreateBody> = ({
  r_rule: rRule,
  ...rest
}) => ({
  ...rest,
  rRule,
});

export const createMaintenanceWindowRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH,
      validate: {
        body: bodySchema,
      },
      options: {
        tags: [`access:${MAINTENANCE_WINDOW_API_PRIVILEGES.WRITE_MAINTENANCE_WINDOW}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();
        const maintenanceWindow = await maintenanceWindowClient.create(rewriteQueryReq(req.body));
        return res.ok({
          body: rewriteMaintenanceWindowRes(maintenanceWindow),
        });
      })
    )
  );
};
