/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '../../../../../../../src/core/public/http/types';
import type { RewriteRequestCase } from '../../../../../actions/common/rewrite_request_case';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../../alerting/common';
import type { AlertInstanceSummary } from '../../../../../alerting/common/alert_instance_summary';

const rewriteBodyRes: RewriteRequestCase<AlertInstanceSummary> = ({
  alerts,
  rule_type_id: alertTypeId,
  mute_all: muteAll,
  status_start_date: statusStartDate,
  status_end_date: statusEndDate,
  error_messages: errorMessages,
  last_run: lastRun,
  ...rest
}: any) => ({
  ...rest,
  alertTypeId,
  muteAll,
  statusStartDate,
  statusEndDate,
  errorMessages,
  lastRun,
  instances: alerts,
});

export async function loadAlertInstanceSummary({
  http,
  alertId,
}: {
  http: HttpSetup;
  alertId: string;
}): Promise<AlertInstanceSummary> {
  const res = await http.get(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(alertId)}/_alert_summary`
  );
  return rewriteBodyRes(res);
}
