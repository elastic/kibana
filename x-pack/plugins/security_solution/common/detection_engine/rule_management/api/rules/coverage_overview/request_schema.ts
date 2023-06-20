/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';

export type CoverageOverviewRuleActivity = t.TypeOf<typeof CoverageOverviewRuleActivity>;
export const CoverageOverviewRuleActivity = t.union([
  t.literal('enabled'),
  t.literal('disabled'),
  t.literal('available'),
]);

export type CoverageOverviewRuleSource = t.TypeOf<typeof CoverageOverviewRuleSource>;
export const CoverageOverviewRuleSource = t.union([
  t.literal('prebuilt'),
  t.literal('custom'),
  t.literal('customized'), // Customized prebuilt rule
]);

export type CoverageOverviewFilter = t.TypeOf<typeof CoverageOverviewFilter>;
export const CoverageOverviewFilter = t.partial({
  searchTerm: NonEmptyString,
  activity: CoverageOverviewRuleActivity,
  source: CoverageOverviewRuleSource,
});

export type CoverageOverviewRequest = t.TypeOf<typeof CoverageOverviewRequest>;
export const CoverageOverviewRequest = t.partial({
  filter: CoverageOverviewFilter,
});
