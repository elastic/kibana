/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import type { CreateExceptionListItemSchemaDecoded } from '@kbn/securitysolution-io-ts-list-types';
import { createExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { RequiredKeepUndefined } from '@kbn/osquery-plugin/common/types';

export const addRuleExceptionsSchema = t.exact(
  t.type({
    items: t.array(createExceptionListItemSchema),
  })
);

export type AddRuleExceptionSchema = t.TypeOf<typeof addRuleExceptionsSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type AddRuleExceptionSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof addRuleExceptionsSchema>>,
  'items'
> & {
  items: CreateExceptionListItemSchemaDecoded[];
};
