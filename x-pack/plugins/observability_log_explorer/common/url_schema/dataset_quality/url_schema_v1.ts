/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const urlSchemaRT = rt.exact(
  rt.partial({
    v: rt.literal(1),
    page: rt.number,
  })
);

export type UrlSchema = rt.TypeOf<typeof urlSchemaRT>;
