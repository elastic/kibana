/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { IRouter } from '../../../../../src/core/server/http/router/router';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../common';
import type { AlertTaskState } from '../../common/alert_task_instance';
import type { ILicenseState } from '../lib/license_state';
import type { AlertingRequestHandlerContext } from '../types';
import type { RewriteResponseCase } from './lib/rewrite_request_case';
import { verifyAccessAndContext } from './lib/verify_access_and_context';

const paramSchema = schema.object({
  id: schema.string(),
});

const rewriteBodyRes: RewriteResponseCase<AlertTaskState> = ({
  alertTypeState,
  alertInstances,
  previousStartedAt,
  ...rest
}) => ({
  ...rest,
  rule_type_state: alertTypeState,
  alerts: alertInstances,
  previous_started_at: previousStartedAt,
});

export const getRuleStateRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/state`,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = context.alerting.getRulesClient();
        const { id } = req.params;
        const state = await rulesClient.getAlertState({ id });
        return state ? res.ok({ body: rewriteBodyRes(state) }) : res.noContent();
      })
    )
  );
};
