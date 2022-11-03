/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionPluginRouter } from '../../../../types';

import { createRuleExceptionsRoute } from './create_rule_exceptions/route';
import { findRuleExceptionReferencesRoute } from './find_exception_references/route';
// import { createSharedExceptionListRoute } from './create_shared_exception_list/route';

export const registerRuleExceptionsRoutes = (router: SecuritySolutionPluginRouter) => {
  createRuleExceptionsRoute(router);
  findRuleExceptionReferencesRoute(router);
  // createSharedExceptionListRoute(router);
};
