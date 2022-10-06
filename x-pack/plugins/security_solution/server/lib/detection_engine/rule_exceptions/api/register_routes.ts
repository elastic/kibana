/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionPluginRouter } from '../../../../types';
import { findRuleExceptionReferencesRoute } from './find_rule_exception_references/route';
import { createRuleExceptionsRoute } from './create_rule_default_exceptions/route';

export const registerRuleExceptionsRoutes = (router: SecuritySolutionPluginRouter) => {
  findRuleExceptionReferencesRoute(router);
  createRuleExceptionsRoute(router);
};
