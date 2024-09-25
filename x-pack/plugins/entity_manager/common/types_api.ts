/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

/**
 * Managed entities enablement
 */
export const managedEntityEnabledResponseRT = rt.type({
  enabled: rt.boolean,
  reason: rt.string,
});
export type ManagedEntityEnabledResponse = rt.TypeOf<typeof managedEntityEnabledResponseRT>;

export const managedEntityResponseBase = rt.type({
  success: rt.boolean,
  reason: rt.string,
  message: rt.string,
});
export type EnableManagedEntityResponse = rt.TypeOf<typeof managedEntityResponseBase>;
export type DisableManagedEntityResponse = rt.TypeOf<typeof managedEntityResponseBase>;
