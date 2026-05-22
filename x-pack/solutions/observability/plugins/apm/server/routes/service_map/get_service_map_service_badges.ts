/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_NUMBER_OF_SERVICES } from '../services/get_services/get_services_items';
import type { ServiceAlertsResponse } from '../services/get_services/get_service_alerts';
import { getServicesAlerts } from '../services/get_services/get_service_alerts';
import type { ServiceSloStatsResponse } from '../services/get_services/get_services_slo_stats';
import { getServicesSloStats } from '../services/get_services/get_services_slo_stats';
import type { ApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import type { ApmSloClient } from '../../lib/helpers/get_apm_slo_client';

export interface ServiceMapServiceBadgesResponse {
  alerts: ServiceAlertsResponse;
  slos: ServiceSloStatsResponse;
}

export async function getServiceMapServiceBadges({
  serviceNames,
  environment,
  start,
  end,
  kuery,
  apmAlertsClient,
  sloClient,
}: {
  serviceNames: string[];
  environment: string;
  start: number;
  end: number;
  kuery?: string;
  apmAlertsClient?: ApmAlertsClient;
  sloClient?: ApmSloClient;
}): Promise<ServiceMapServiceBadgesResponse> {
  if (serviceNames.length === 0) {
    return { alerts: [], slos: [] };
  }

  const uniqueServiceNames = [...new Set(serviceNames)];
  const cappedSize = Math.min(uniqueServiceNames.length, MAX_NUMBER_OF_SERVICES);

  const [alerts, slos] = await Promise.all([
    apmAlertsClient
      ? getServicesAlerts({
          apmAlertsClient,
          environment,
          start,
          end,
          kuery,
          serviceNames: uniqueServiceNames,
          maxNumServices: cappedSize,
        })
      : Promise.resolve([]),
    getServicesSloStats({
      sloClient,
      environment,
      serviceNames: uniqueServiceNames,
      maxNumServices: cappedSize,
    }),
  ]);

  return { alerts, slos };
}
