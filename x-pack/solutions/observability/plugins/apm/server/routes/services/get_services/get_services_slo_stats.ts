/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmSloClient } from '../../../lib/helpers/get_apm_slo_client';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import type { SloStatus } from '../../../../common/service_inventory';

const STATUS_PRIORITY: SloStatus[] = ['violated', 'degrading', 'noData', 'healthy'];
export type SloSummary = Record<SloStatus, number>;

export type ServiceSloStatsResponse = Array<{
  serviceName: string;
  sloStatus: SloStatus;
  sloCount: number;
}>;

export async function getServicesSloStats({
  sloClient,
  environment,
  maxNumServices,
  serviceNames = [],
}: {
  sloClient?: ApmSloClient;
  maxNumServices?: number;
  environment: string;
  serviceNames?: string[];
}): Promise<ServiceSloStatsResponse> {
  if (!sloClient) {
    return [];
  }

  const response = await sloClient.getGroupedStats({
    type: 'apm',
    size: maxNumServices,
    environment: environment === ENVIRONMENT_ALL.value ? undefined : environment,
    serviceNames,
  });

  return response.results.map((result) => {
    const { sloStatus, sloCount } = getWorstSloStatus(result.summary);
    return {
      serviceName: result.entity,
      sloStatus,
      sloCount,
    };
  });
}

export function getWorstSloStatus(summary: SloSummary): {
  sloStatus: SloStatus;
  sloCount: number;
} {
  for (let i = 0; i < STATUS_PRIORITY.length; i++) {
    if (summary[STATUS_PRIORITY[i]] > 0) {
      return {
        sloStatus: STATUS_PRIORITY[i],
        sloCount: summary[STATUS_PRIORITY[i]],
      };
    }
  }
  return { sloStatus: 'healthy', sloCount: 0 };
}
