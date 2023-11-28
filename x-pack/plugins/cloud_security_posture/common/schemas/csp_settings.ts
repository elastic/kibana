/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema as rt, TypeOf } from '@kbn/config-schema';

const rulesStates = rt.recordOf(
  rt.string(),
  rt.object({
    muted: rt.boolean(),
  })
);

export const cspSettingsSchema = rt.object({
  rules_states: rulesStates,
});

export type CspRulesStates = TypeOf<typeof rulesStates>;
export type CspSettings = TypeOf<typeof cspSettingsSchema>;
