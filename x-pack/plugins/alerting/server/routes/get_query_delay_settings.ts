/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { verifyAccessAndContext, RewriteResponseCase } from './lib';
import { API_PRIVILEGES, RulesSettingsQueryDelay } from '../../common';

const rewriteBodyRes: RewriteResponseCase<RulesSettingsQueryDelay> = ({
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  ...rest
}) => ({
  ...rest,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
});

export const getQueryDelaySettingsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_query_delay`,
      validate: false,
      options: {
        tags: [`access:${API_PRIVILEGES.READ_QUERY_DELAY_SETTINGS}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesSettingsClient = (await context.alerting).getRulesSettingsClient();
        const queryDelaySettings = await rulesSettingsClient.queryDelay().get();
        return res.ok({ body: rewriteBodyRes(queryDelaySettings) });
      })
    )
  );
};
