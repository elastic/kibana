/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const SyntheticsParamSOCodec = t.intersection([
  t.interface({
    key: t.string,
    value: t.string,
  }),
  t.partial({
    description: t.string,
    tags: t.array(t.string),
    namespaces: t.array(t.string),
  }),
]);

export type SyntheticsParamSO = t.TypeOf<typeof SyntheticsParamSOCodec>;

export const SyntheticsParamRequestCodec = t.intersection([
  t.interface({
    key: t.string,
    value: t.string,
  }),
  t.partial({
    description: t.string,
    tags: t.array(t.string),
    share_across_spaces: t.boolean,
  }),
]);

export type SyntheticsParamRequest = t.TypeOf<typeof SyntheticsParamRequestCodec>;
