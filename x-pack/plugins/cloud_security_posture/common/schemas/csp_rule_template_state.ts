/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema as rt, TypeOf } from '@kbn/config-schema';

export const cspRuleTemplateStateSchema = rt.object({
  id: rt.string(),
  enabled: rt.boolean(),
});

export type CspRuleTemplateState = TypeOf<typeof cspRuleTemplateStateSchema>;
