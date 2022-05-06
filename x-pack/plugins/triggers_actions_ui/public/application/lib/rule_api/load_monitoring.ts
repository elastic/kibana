/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { AsApiContract } from '@kbn/actions-plugin/common';
import { RuleMonitoringMetrics } from '@kbn/alerting-plugin/common/monitoring/types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export interface LoadMonitoringProps {
  ruleId: string;
}

export const loadMonitoring = async ({
  ruleId,
  http,
}: LoadMonitoringProps & { http: HttpSetup }) => {
  const result = await http.get<AsApiContract<RuleMonitoringMetrics>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${ruleId}/monitoring/aggregate`
  );
  return result; // rewriteBodyRes(result);
};
