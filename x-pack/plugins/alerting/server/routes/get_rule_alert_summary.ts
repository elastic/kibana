/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { IRouter } from '../../../../../src/core/server/http/router/router';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../common';
import type { AlertInstanceSummary } from '../../common/alert_instance_summary';
import type { ILicenseState } from '../lib/license_state';
import type { GetAlertInstanceSummaryParams } from '../rules_client/rules_client';
import type { AlertingRequestHandlerContext } from '../types';
import type { RewriteRequestCase, RewriteResponseCase } from './lib/rewrite_request_case';
import { verifyAccessAndContext } from './lib/verify_access_and_context';

const paramSchema = schema.object({
  id: schema.string(),
});

const querySchema = schema.object({
  date_start: schema.maybe(schema.string()),
});

const rewriteReq: RewriteRequestCase<GetAlertInstanceSummaryParams> = ({
  date_start: dateStart,
  ...rest
}) => ({
  ...rest,
  dateStart,
});
const rewriteBodyRes: RewriteResponseCase<AlertInstanceSummary> = ({
  alertTypeId,
  muteAll,
  statusStartDate,
  statusEndDate,
  errorMessages,
  lastRun,
  instances: alerts,
  ...rest
}) => ({
  ...rest,
  alerts,
  rule_type_id: alertTypeId,
  mute_all: muteAll,
  status_start_date: statusStartDate,
  status_end_date: statusEndDate,
  error_messages: errorMessages,
  last_run: lastRun,
});

export const getRuleAlertSummaryRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_alert_summary`,
      validate: {
        params: paramSchema,
        query: querySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = context.alerting.getRulesClient();
        const { id } = req.params;
        const summary = await rulesClient.getAlertInstanceSummary(rewriteReq({ id, ...req.query }));
        return res.ok({ body: rewriteBodyRes(summary) });
      })
    )
  );
};
