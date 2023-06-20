/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { NonEmptyArray } from '@kbn/securitysolution-io-ts-types';
import { CoverageOverviewRuleActivity } from './request_schema';

export type CoverageOverviewRuleData = t.TypeOf<typeof CoverageOverviewRuleData>;
export const CoverageOverviewRuleData = t.type({
  name: t.string,
  activity: CoverageOverviewRuleActivity,
});

export type CoverageOverviewUnmappedRuleData = t.TypeOf<typeof CoverageOverviewUnmappedRuleData>;
export const CoverageOverviewUnmappedRuleData = t.type({
  id: t.string,
  name: t.string,
});

export type MitreCoverageResponse = t.TypeOf<typeof MitreCoverageResponse>;
export const MitreCoverageResponse = t.exact(
  t.type({
    coverage: t.record(t.string, NonEmptyArray(t.string)),
    rules_data: t.record(t.string, NonEmptyArray(CoverageOverviewRuleData)),
    unmapped_rules: t.array(CoverageOverviewUnmappedRuleData),
  })
);
