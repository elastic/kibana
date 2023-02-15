/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../lib';
import { verifyAccessAndContext, rewriteRule } from './lib';
import {
  AlertingRequestHandlerContext,
  BASE_ALERTING_API_PATH,
  INTERNAL_BASE_ALERTING_API_PATH,
} from '../types';

const paramSchema = schema.object({
  id: schema.string(),
});

interface BuildGetRulesRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  excludeFromPublicApi?: boolean;
}
const buildGetRuleRoute = ({
  licenseState,
  path,
  router,
  excludeFromPublicApi = false,
}: BuildGetRulesRouteParams) => {
  router.get(
    {
      path,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const { id } = req.params;
        const rule = await rulesClient.get({
          id,
          excludeFromPublicApi,
          includeSnoozeData: true,
        });
        return res.ok({
          body: rewriteRule(rule),
        });
      })
    )
  );
};

export const getRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildGetRuleRoute({
    excludeFromPublicApi: true,
    licenseState,
    path: `${BASE_ALERTING_API_PATH}/rule/{id}`,
    router,
  });

export const getInternalRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildGetRuleRoute({
    excludeFromPublicApi: false,
    licenseState,
    path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}`,
    router,
  });
