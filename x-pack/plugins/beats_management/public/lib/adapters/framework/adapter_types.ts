/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

export const RuntimeFrameworkInfo = t.type({
  basePath: t.string,
  license: t.type({
    type: t.union(['oss', 'trial', 'standard', 'basic', 'gold', 'platinum'].map(s => t.literal(s))),
    expired: t.boolean,
    expiry_date_in_millis: t.number,
  }),
  security: t.type({
    enabled: t.boolean,
    available: t.boolean,
  }),
});
export interface FrameworkInfo extends t.TypeOf<typeof RuntimeFrameworkInfo> {}
