/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const AllowedValue = t.partial({
  description: t.string,
  name: t.string,
});

export const AllowedValues = t.array(AllowedValue);

export type AllowedValues = t.TypeOf<typeof AllowedValues>;

export const GetUnallowedFieldValuesBody = t.array(
  t.type({
    indexName: t.string,
    indexFieldName: t.string,
    allowedValues: AllowedValues,
    from: t.string,
    to: t.string,
  })
);

export type GetUnallowedFieldValuesInputs = t.TypeOf<typeof GetUnallowedFieldValuesBody>;

export type EcsFlatLike = Partial<Record<string, { type: string; [key: string]: unknown }>>;
