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
  rewritePartialMaintenanceBodyRes,
} from '../lib';
import {
  AlertingRequestHandlerContext,
  INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH,
} from '../../types';
import { MaintenanceWindowSOProperties, MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../common';

const paramSchema = schema.object({
  id: schema.string(),
});

const bodySchema = schema.object({
  title: schema.maybe(schema.string()),
  enabled: schema.maybe(schema.boolean()),
  duration: schema.maybe(schema.number()),
  r_rule: schema.maybe(rRuleSchema),
});

interface MaintenanceWindowUpdateBody {
  title?: MaintenanceWindowSOProperties['title'];
  enabled?: MaintenanceWindowSOProperties['enabled'];
  duration?: MaintenanceWindowSOProperties['duration'];
  rRule?: MaintenanceWindowSOProperties['rRule'];
}

export const rewriteQueryReq: RewriteRequestCase<MaintenanceWindowUpdateBody> = ({
  r_rule: rRule,
  ...rest
}) => ({
  ...rest,
  ...(rRule ? { rRule } : {}),
});

export const updateMaintenanceWindowRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/{id}`,
      validate: {
        body: bodySchema,
        params: paramSchema,
      },
      options: {
        tags: [`access:${MAINTENANCE_WINDOW_API_PRIVILEGES.WRITE_MAINTENANCE_WINDOW}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();
        const maintenanceWindow = await maintenanceWindowClient.update({
          id: req.params.id,
          ...rewriteQueryReq(req.body),
        });
        return res.ok({
          body: rewritePartialMaintenanceBodyRes(maintenanceWindow),
        });
      })
    )
  );
};
