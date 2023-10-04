/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
// TODO https://github.com/elastic/security-team/issues/7491
// eslint-disable-next-line no-restricted-imports
import { RuleObjectId, RuleSignatureId } from '../../model/rule_schema_legacy';

export type QueryRuleByIds = t.TypeOf<typeof QueryRuleByIds>;
export const QueryRuleByIds = t.exact(
  t.partial({
    rule_id: RuleSignatureId,
    id: RuleObjectId,
  })
);
