/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_API_ROUTES } from '../../constants';
import type { FleetRequestHandler } from '../../types';
import type { FleetAuthzRouter } from '../security';
import { appContextService } from '../../services';

export const getHealthCheckHandler: FleetRequestHandler<undefined, undefined, undefined> = async (
  context,
  request,
  response
) => {
  const logger = appContextService.getLogger();
  const soClient = (await context.fleet).epm.internalSoClient;
  const esClient = (await context.core).elasticsearch.client.asInternalUser;
  const report: string[] = [];

  try {
    // TODO
    report.push('--- Starting Fleet health check report ---');
    report.push('--- Finished Fleet health check report ---');
  } catch (error) {
    report.push(`‼️ Error finishing health check report, check Kibana logs for more details:`);
    report.push(error.message);
    logger.error(error);
  }

  return response.ok({
    body: report.join('\n'),
    headers: { 'content-type': 'text/plain' },
  });
};

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.get(
    {
      path: APP_API_ROUTES.HEALTH_CHECK_PATTERN,
      validate: {},
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getHealthCheckHandler
  );
};
