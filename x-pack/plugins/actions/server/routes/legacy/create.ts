/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { IRouter } from '@kbn/core/server';
import { ActionsRequestHandlerContext } from '../../types';
import { ILicenseState } from '../../lib';
import { BASE_ACTION_API_PATH } from '../../../common';
import { verifyAccessAndContext } from '../verify_access_and_context';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';

export const bodySchema = schema.object({
  name: schema.string(),
  actionTypeId: schema.string(),
  config: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  secrets: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
});

export const createActionRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  router.post(
    {
      path: `${BASE_ACTION_API_PATH}/action`,
      validate: {
        body: bodySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        const action = req.body;
        trackLegacyRouteUsage('create', usageCounter);
        return res.ok({
          body: await actionsClient.create({ action }),
        });
      })
    )
  );
};
