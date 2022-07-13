/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import type { CreateExceptionListSchemaDecoded } from '@kbn/securitysolution-io-ts-list-types';
import { createExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { RequiredKeepUndefined } from '@kbn/osquery-plugin/common/types';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';

export const createRuleDefaultExceptionListSchema = t.intersection([
  t.type({
    rule_so_id: NonEmptyString,
    list_type: NonEmptyString,
  }),
  t.partial({
    list: createExceptionListSchema,
  }),
]);

export type CreateRuleDefaultExceptionListSchema = t.TypeOf<
  typeof createRuleDefaultExceptionListSchema
>;

// This type is used after a decode since some things are defaults after a decode.
export type CreateRuleDefaultExceptionListSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof createRuleDefaultExceptionListSchema>>,
  'list'
> & {
  list: CreateExceptionListSchemaDecoded;
};
