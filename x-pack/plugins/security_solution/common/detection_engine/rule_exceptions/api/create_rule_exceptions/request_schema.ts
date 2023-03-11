/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import type { CreateRuleExceptionListItemSchemaDecoded } from '@kbn/securitysolution-io-ts-list-types';
import { createRuleExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { RequiredKeepUndefined } from '@kbn/osquery-plugin/common/types';

import { RuleObjectId } from '../../../rule_schema';

/**
 * URL path parameters of the API route.
 */
export type CreateRuleExceptionsRequestParams = t.TypeOf<typeof CreateRuleExceptionsRequestParams>;
export const CreateRuleExceptionsRequestParams = t.exact(
  t.type({
    id: RuleObjectId,
  })
);

export type CreateRuleExceptionsRequestParamsDecoded = CreateRuleExceptionsRequestParams;

/**
 * Request body parameters of the API route.
 */
export type CreateRuleExceptionsRequestBody = t.TypeOf<typeof CreateRuleExceptionsRequestBody>;
export const CreateRuleExceptionsRequestBody = t.exact(
  t.type({
    items: t.array(createRuleExceptionListItemSchema),
  })
);

/**
 * This type is used after a decode since some things are defaults after a decode.
 */
export type CreateRuleExceptionsRequestBodyDecoded = Omit<
  RequiredKeepUndefined<CreateRuleExceptionsRequestBody>,
  'items'
> & {
  items: CreateRuleExceptionListItemSchemaDecoded[];
};
