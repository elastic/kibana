/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '../../../../../src/core/server';
import { defineGetComplianceDashboardRoute } from './compliance_dashboard/compliance_dashboard';
import { defineGetBenchmarksRoute } from './benchmarks/benchmarks';
import { defineFindingsIndexRoute as defineGetFindingsIndexRoute } from './findings/findings';
import { defineUpdateRulesConfigRoute } from './configuration/update_rules_configuration';
import { CspAppContext } from '../plugin';

export function defineRoutes(router: IRouter, cspContext: CspAppContext) {
  defineGetComplianceDashboardRoute(router, cspContext);
  defineGetFindingsIndexRoute(router, cspContext);
  defineGetBenchmarksRoute(router, cspContext);
  defineUpdateRulesConfigRoute(router, cspContext);
}
