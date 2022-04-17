/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState } from '../lib';
import { GetAlertSummaryParams } from '../rules_client';
import { RewriteRequestCase, RewriteResponseCase, verifyAccessAndContext } from './lib';
import {
  AlertingRequestHandlerContext,
  INTERNAL_BASE_ALERTING_API_PATH,
  AlertSummary,
} from '../types';

const paramSchema = schema.object({
  id: schema.string(),
});

const querySchema = schema.object({
  date_start: schema.maybe(schema.string()),
  number_of_executions: schema.maybe(schema.number()),
});

const rewriteReq: RewriteRequestCase<GetAlertSummaryParams> = ({
  date_start: dateStart,
  number_of_executions: numberOfExecutions,
  ...rest
}) => ({
  ...rest,
  numberOfExecutions,
  dateStart,
});

const rewriteBodyRes: RewriteResponseCase<AlertSummary> = ({
  ruleTypeId,
  muteAll,
  statusStartDate,
  statusEndDate,
  errorMessages,
  lastRun,
  executionDuration: { valuesWithTimestamp, ...executionDuration },
  ...rest
}) => ({
  ...rest,
  rule_type_id: ruleTypeId,
  mute_all: muteAll,
  status_start_date: statusStartDate,
  status_end_date: statusEndDate,
  error_messages: errorMessages,
  last_run: lastRun,
  execution_duration: {
    ...executionDuration,
    values_with_timestamp: valuesWithTimestamp,
  },
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
        const summary = await rulesClient.getAlertSummary(rewriteReq({ id, ...req.query }));
        return res.ok({ body: rewriteBodyRes(summary) });
      })
    )
  );
};
