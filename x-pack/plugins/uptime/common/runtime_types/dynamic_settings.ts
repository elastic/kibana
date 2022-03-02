/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const DefaultEmailType = t.intersection([
  t.type({
    to: t.array(t.string),
  }),
  t.partial({
    cc: t.array(t.string),
    bcc: t.array(t.string),
  }),
]);

export const DynamicSettingsType = t.intersection([
  t.strict({
    heartbeatIndices: t.string,
    certAgeThreshold: t.number,
    certExpirationThreshold: t.number,
    defaultConnectors: t.array(t.string),
  }),
  t.partial({
    defaultEmail: DefaultEmailType,
  }),
]);

export const DynamicSettingsSaveType = t.intersection([
  t.type({
    success: t.boolean,
  }),
  t.partial({
    error: t.string,
  }),
]);

export type DynamicSettings = t.TypeOf<typeof DynamicSettingsType>;
export type DefaultEmail = t.TypeOf<typeof DefaultEmailType>;
export type DynamicSettingsSaveResponse = t.TypeOf<typeof DynamicSettingsSaveType>;
