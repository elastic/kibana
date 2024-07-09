/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../common';
import { ActionsRequestHandlerContext } from '../../types';
import { ILicenseState } from '../../lib';
import { verifyAccessAndContext } from '../verify_access_and_context';
import { notificationPolicySchema } from '../../actions_client';

export const createNotificationRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/policy`,
      options: {
        access: 'public',
        summary: 'Create a notification policy',
      },
      validate: {
        body: notificationPolicySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        return res.ok({
          body: await actionsClient.createNotificationPolicy(req.body),
        });
      })
    )
  );
};
