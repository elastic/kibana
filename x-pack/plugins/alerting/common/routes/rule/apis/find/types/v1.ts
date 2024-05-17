/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { findRulesRequestQuerySchemaV1 } from '..';
import { RuleParamsV1, RuleResponseV1 } from '../../../response';

export type FindRulesRequestQuery = TypeOf<typeof findRulesRequestQuerySchemaV1>;

export interface FindRulesResponse<Params extends RuleParamsV1 = never> {
  body: {
    page: number;
    per_page: number;
    total: number;
    data: Array<Partial<RuleResponseV1<Params>>>;
  };
}
