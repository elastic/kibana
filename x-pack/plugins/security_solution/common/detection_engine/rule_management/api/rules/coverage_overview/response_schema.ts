/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { NonEmptyArray } from '@kbn/securitysolution-io-ts-types';
import { CoverageOverviewRuleActivitySchema } from './request_schema';

export type CoverageOverviewRuleAttributes = t.TypeOf<typeof CoverageOverviewRuleAttributes>;
export const CoverageOverviewRuleAttributes = t.type({
  name: t.string,
  activity: CoverageOverviewRuleActivitySchema,
});

export type CoverageOverviewResponse = t.TypeOf<typeof CoverageOverviewResponse>;
export const CoverageOverviewResponse = t.exact(
  t.type({
    /**
     * Map having (tacticId, techniqueId or subtechniqueId) as the key and an array of rule ids as the value
     */
    coverage: t.record(t.string, NonEmptyArray(t.string)),
    /**
     * Array of unmapped rule ids
     */
    unmapped_rule_ids: t.array(t.string),
    /**
     * Map having ruleId as the key and coverage overview rule data as the value
     */
    rules_data: t.record(t.string, CoverageOverviewRuleAttributes),
  })
);
