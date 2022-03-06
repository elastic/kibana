/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from 'src/core/server';
import { CIS_BENCHMARK_1_4_1_RULE_TEMPLATES } from './csp_rule_templates';
import { cspRuleTemplateSavedObjectType } from '../../common/schemas/csp_rule_template';

export const initializeCspRuleTemplates = async (client: ISavedObjectsRepository) => {
  const existingRules = await client.find({ type: cspRuleTemplateSavedObjectType, perPage: 1 });

  // TODO: version?
  if (existingRules.total !== 0) return;

  try {
    await client.bulkCreate(CIS_BENCHMARK_1_4_1_RULE_TEMPLATES);
  } catch (e) {
    // TODO: add logger
    // TODO: handle error
  }
};
