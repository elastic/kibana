/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const partial = t.exact(
  t.partial({
    buttonLabel: t.string,
  })
);
const required = t.exact(
  t.type({
    type: t.string,
    message: t.string,
    actionPath: t.string,
  })
);

export const warningSchema = t.intersection([partial, required]);
export type WarningSchema = t.TypeOf<typeof warningSchema>;
