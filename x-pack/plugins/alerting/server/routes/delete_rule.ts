/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { ILicenseState } from '../lib';
import { verifyAccessAndContext } from './lib';
import { AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../types';

const paramSchema = z.object({
  id: z.string(),
});

export const deleteRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.delete(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}`,
      validate: {
        params: paramSchema,
      },
      options: {
        isZod: true,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const { id } = req.params;
        await rulesClient.delete({ id });
        return res.noContent();
      })
    )
  );
};
