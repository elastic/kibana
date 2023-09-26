/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState } from '../lib';
import { verifyAccessAndContext, RewriteResponseCase } from './lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { API_PRIVILEGES, RulesSettingsQueryDelay } from '../../common';

const bodySchema = schema.object({
  delay: schema.number(),
});

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

export const updateQueryDelaySettingsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_query_delay`,
      validate: {
        body: bodySchema,
      },
      options: {
        tags: [`access:${API_PRIVILEGES.WRITE_QUERY_DELAY_SETTINGS}`],
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesSettingsClient = (await context.alerting).getRulesSettingsClient();

        const updatedQueryDelaySettings = await rulesSettingsClient.queryDelay().update(req.body);

        return res.ok({
          body: updatedQueryDelaySettings && rewriteBodyRes(updatedQueryDelaySettings),
        });
      })
    )
  );
};
