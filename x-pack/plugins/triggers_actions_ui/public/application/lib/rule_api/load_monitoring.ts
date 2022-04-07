/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import { AsApiContract } from '../../../../../actions/common';

export interface LoadMonitoringProps {
  ruleId: string;
}

export const loadMonitoring = async ({
  ruleId,
  http,
}: LoadMonitoringProps & { http: HttpSetup }) => {
  const result = await http.get<AsApiContract<any>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${ruleId}/monitoring/aggregate`
  );

  return result; // rewriteBodyRes(result);
};
