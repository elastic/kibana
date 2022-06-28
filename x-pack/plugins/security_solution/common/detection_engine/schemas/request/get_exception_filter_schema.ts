/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import * as t from 'io-ts';

export const exceptionListId = t.type({
  exceptionListId: t.string,
  type: t.literal('exceptionListId'),
});
export const exceptions = t.type({
  exceptions: t.array(exceptionListItemSchema),
  type: t.literal('exceptionItems'),
});

export const getExceptionFilterSchema = t.union([exceptions, exceptionListId]);

export type GetExceptionFilterSchema = t.TypeOf<typeof getExceptionFilterSchema>;
