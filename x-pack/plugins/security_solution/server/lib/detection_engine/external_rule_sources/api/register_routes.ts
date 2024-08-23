/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionPluginRouter } from '../../../../types';

import { createExternalRuleSource } from './create_external_rule_source/create_external_rule_source';
import { deleteExternalRuleSource } from './delete_external_rule_source/delete_external_rule_source';
import { readExternalRuleSource } from './read_external_rule_sources/read_external_rule_source';

export const registerExternalRuleSourceRoutes = (router: SecuritySolutionPluginRouter) => {
  createExternalRuleSource(router);
  readExternalRuleSource(router);
  deleteExternalRuleSource(router);
};
