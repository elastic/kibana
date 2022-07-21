/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema as rt, TypeOf } from '@kbn/config-schema';
import { benchmarkIdSchema } from './csp_rule_metadata';

// cspRulesConfigSchema has to match the 'DataYaml' struct in https://github.com/elastic/cloudbeat/blob/main/config/config.go#L45-L51
export const cspRulesConfigSchema = rt.object({
  data_yaml: rt.object({
    activated_rules: rt.recordOf(benchmarkIdSchema, rt.arrayOf(rt.string())),
  }),
});

export type CspRulesConfiguration = TypeOf<typeof cspRulesConfigSchema>;
