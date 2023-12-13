/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState } from '../lib';
import { verifyAccessAndContext } from './lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';

import { ParamsSchema } from '../../../stack_alerts/server/rule_types/user_defined/rule_type';

const bodySchema = schema.object({
  params: ParamsSchema,
});

export const testRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/_test`,
      validate: {
        body: bodySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        try {
          const rulesClient = (await context.alerting).getRulesClient();
          const result = await rulesClient.test({ params: req.body.params });
          return res.ok({ body: result });
        } catch (e) {
          return res.badRequest({ body: { message: e.message } });
        }
      })
    )
  );
};
