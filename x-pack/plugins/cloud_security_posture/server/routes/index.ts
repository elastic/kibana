/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineGetComplianceDashboardRoute } from './compliance_dashboard/compliance_dashboard';
import { defineGetBenchmarksRoute } from './benchmarks/benchmarks';
import { defineUpdateRulesConfigRoute } from './configuration/update_rules_configuration';
import { defineGetCspSetupStatusRoute } from './setup_status/setup_status';
import { defineEsPitRoute } from './es_pit/es_pit';
import { CspAppContext } from '../plugin';
import { CspRouter } from '../types';

export function defineRoutes(router: CspRouter, cspContext: CspAppContext) {
  defineGetComplianceDashboardRoute(router, cspContext);
  defineGetBenchmarksRoute(router, cspContext);
  defineUpdateRulesConfigRoute(router, cspContext);
  defineGetCspSetupStatusRoute(router, cspContext);
  defineEsPitRoute(router, cspContext);
}
