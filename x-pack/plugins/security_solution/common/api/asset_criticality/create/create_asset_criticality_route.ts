/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

const Criticality = t.keyof({
  very_important: null,
  important: null,
  normal: null,
  not_important: null,
});

export const createCriticalityRecordRequestBody = t.exact(
  t.type({
    id_value: t.string,
    id_field: t.string,
    criticality: Criticality,
  })
);

export type CreateCriticalityRecordRequestBody = t.TypeOf<
  typeof createCriticalityRecordRequestBody
>;
