/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetInfraMetricsRequestBodyPayload } from '../../../../common/http_api/infra';
import { InfraAlertsClient } from '../../../lib/helpers/get_infra_alerts_client';
import { InfraMetricsClient } from '../../../lib/helpers/get_infra_metrics_client';

export interface GetHostsArgs {
  infraMetricsClient: InfraMetricsClient;
  alertsClient: InfraAlertsClient;
  params: GetInfraMetricsRequestBodyPayload;
}
