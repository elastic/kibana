/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const AllowedValues = t.array(t.string);

export type AllowedValuesInputs = t.TypeOf<typeof AllowedValues>;

export const GetUnallowedFieldValuesBody = t.array(
  t.type({
    indexName: t.string,
    indexFieldName: t.string,
    allowedValues: AllowedValues,
  })
);

export type GetUnallowedFieldValuesInputs = t.TypeOf<typeof GetUnallowedFieldValuesBody>;
