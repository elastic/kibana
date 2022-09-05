/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema as rt, TypeOf } from '@kbn/config-schema';

// cspRulesConfigSchema has to match the 'RuntimeCfg' struct in https://github.com/elastic/cloudbeat/blob/main/config/config.go#L45-L51
export const cspRulesConfigSchema = rt.object({
  runtime_cfg: rt.object({
    activated_rules: rt.recordOf(rt.string(), rt.arrayOf(rt.string())),
  }),
});

export type CspRulesConfiguration = TypeOf<typeof cspRulesConfigSchema>;
