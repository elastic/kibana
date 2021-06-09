/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { AsApiContract, RewriteRequestCase } from '../../../../../actions/common';
import { AlertingFrameworkHealth, AlertsHealth } from '../../../../../alerting/common';
import { BASE_ALERTING_API_PATH } from '../../constants';

const rewriteAlertingFrameworkHeath: RewriteRequestCase<AlertsHealth> = ({
  decryption_health: decryptionHealth,
  execution_health: executionHealth,
  read_health: readHealth,
  ...res
}: AsApiContract<AlertsHealth>) => ({
  decryptionHealth,
  executionHealth,
  readHealth,
  ...res,
});

const rewriteBodyRes: RewriteRequestCase<AlertingFrameworkHealth> = ({
  is_sufficiently_secure: isSufficientlySecure,
  has_permanent_encryption_key: hasPermanentEncryptionKey,
  alerting_framework_heath: alertingFrameworkHeath,
  ...res
}: AsApiContract<AlertingFrameworkHealth>) => ({
  isSufficientlySecure,
  hasPermanentEncryptionKey,
  alertingFrameworkHeath,
  ...res,
});

export async function alertingFrameworkHealth({
  http,
}: {
  http: HttpSetup;
}): Promise<AlertingFrameworkHealth> {
  const res = await http.get(`${BASE_ALERTING_API_PATH}/_health`);
  const alertingFrameworkHeath = rewriteAlertingFrameworkHeath(res.alerting_framework_heath);
  return { ...rewriteBodyRes(res), alertingFrameworkHeath };
}
