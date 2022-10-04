/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { NonEmptyStringArray } from '@kbn/securitysolution-io-ts-types';
import { DefaultNamespaceArray } from '@kbn/securitysolution-io-ts-list-types';

export const findExceptionReferencesOnRuleSchema = t.exact(
  t.type({
    ids: NonEmptyStringArray,
    list_ids: NonEmptyStringArray,
    namespace_types: DefaultNamespaceArray,
  })
);

export type FindExceptionReferencesOnRuleSchema = t.OutputOf<
  typeof findExceptionReferencesOnRuleSchema
>;

export type FindExceptionReferencesOnRuleSchemaDecoded = t.TypeOf<
  typeof findExceptionReferencesOnRuleSchema
>;
