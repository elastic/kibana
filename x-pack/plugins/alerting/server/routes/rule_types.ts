/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import snakecaseKeys from 'snakecase-keys';
import { ILicenseState } from '../lib';
import { verifyAccessAndContext } from './lib';
import { AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../types';

export const ruleTypesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ALERTING_API_PATH}/rule_types`,
      validate: {},
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        const ruleTypes = Array.from(await rulesClient.listAlertTypes());
        return res.ok({
          body: snakecaseKeys(ruleTypes),
        });
      })
    )
  );
};
