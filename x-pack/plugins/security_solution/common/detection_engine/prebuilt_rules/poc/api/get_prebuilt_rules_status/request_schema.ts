/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export type PrebuiltRuleContentDataModel = t.TypeOf<typeof PrebuiltRuleContentDataModel>;
export const PrebuiltRuleContentDataModel = t.union([
  t.literal('flat'),
  t.literal('composite'),
  t.literal('composite2'),
]);

export type GetPrebuiltRulesStatusRequestQuery = t.TypeOf<
  typeof GetPrebuiltRulesStatusRequestQuery
>;
export const GetPrebuiltRulesStatusRequestQuery = t.exact(
  t.type({
    data_model: PrebuiltRuleContentDataModel,
  })
);
