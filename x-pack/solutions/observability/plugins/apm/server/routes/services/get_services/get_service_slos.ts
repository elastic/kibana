/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SloClient } from '@kbn/slo-plugin/server';
import type { Logger } from '@kbn/logging';

export interface ServiceSLOsResponse {
  serviceName: string;
  slosCount: number;
}

export async function getServicesSLOs({
  serviceNames,
  sloClient,
  logger,
}: {
  serviceNames: string[];
  sloClient: SloClient;
  logger: Logger;
}): Promise<ServiceSLOsResponse[]> {
  if (serviceNames.length === 0) {
    return [];
  }

  try {
    // Fetch SLOs for all services in parallel
    const sloPromises = serviceNames.map(async (serviceName) => {
      try {
        const result = await sloClient.findSLOs({
          kqlQuery: `service.name: "${serviceName}" AND status:"VIOLATED" or status:"DEGRADING"`,
          page: '1',
          perPage: '1',
        });

        return {
          serviceName,
          slosCount: result.total,
        };
      } catch (error) {
        logger.debug(`Failed to fetch SLOs for service ${serviceName}: ${error}`);
        return {
          serviceName,
          slosCount: 0,
        };
      }
    });

    return await Promise.all(sloPromises);
  } catch (error) {
    logger.debug(`Failed to fetch SLOs: ${error}`);
    return serviceNames.map((serviceName) => ({
      serviceName,
      slosCount: 0,
    }));
  }
}
