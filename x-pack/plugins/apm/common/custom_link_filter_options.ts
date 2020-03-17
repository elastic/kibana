/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_TYPE,
  TRANSACTION_NAME
} from './elasticsearch_fieldnames';

export const FilterOptionsRt = t.partial({
  [SERVICE_NAME]: t.union([t.string, t.array(t.string)]),
  [SERVICE_ENVIRONMENT]: t.union([t.string, t.array(t.string)]),
  [TRANSACTION_NAME]: t.union([t.string, t.array(t.string)]),
  [TRANSACTION_TYPE]: t.union([t.string, t.array(t.string)])
});

export type FilterOptions = t.TypeOf<typeof FilterOptionsRt>;

export const filterOptions: Array<keyof FilterOptions> = [
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_TYPE,
  TRANSACTION_NAME
];
