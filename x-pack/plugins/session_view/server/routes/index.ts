/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter } from '@kbn/core/server';
import { RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';
import { registerProcessEventsRoute } from './process_events_route';
import { registerAlertsRoute } from './alerts_route';
import { registerAlertStatusRoute } from './alert_status_route';
import { registerIOEventsRoute } from './io_events_route';
import { registerGetTotalIOBytesRoute } from './get_total_io_bytes_route';

export const registerRoutes = (router: IRouter, ruleRegistry: RuleRegistryPluginStartContract) => {
  registerProcessEventsRoute(router, ruleRegistry);
  registerAlertsRoute(router, ruleRegistry);
  registerAlertStatusRoute(router, ruleRegistry);
  registerIOEventsRoute(router);
  registerGetTotalIOBytesRoute(router);
};
