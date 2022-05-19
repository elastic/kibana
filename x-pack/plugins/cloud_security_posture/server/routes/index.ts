/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineGetComplianceDashboardRoute } from './compliance_dashboard/compliance_dashboard';
import { defineGetBenchmarksRoute } from './benchmarks/benchmarks';
import { defineUpdateRulesConfigRoute } from './configuration/update_rules_configuration';
import { defineGetFindingsStatus } from './findings_status/findings_status';
import { CspAppContext } from '../plugin';
import { CspRouter } from '../types';

export function defineRoutes(router: CspRouter, cspContext: CspAppContext) {
  defineGetComplianceDashboardRoute(router, cspContext);
  defineGetBenchmarksRoute(router, cspContext);
  defineUpdateRulesConfigRoute(router, cspContext);
  defineGetFindingsStatus(router, cspContext);
}
