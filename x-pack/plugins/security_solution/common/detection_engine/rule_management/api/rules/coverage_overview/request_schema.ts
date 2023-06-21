/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { enumeration, NonEmptyString } from '@kbn/securitysolution-io-ts-types';

export enum CoverageOverviewRuleActivity {
  Enabled = 'enabled',
  Disabled = 'disabled',
  Available = 'available',
}
export const CoverageOverviewRuleActivitySchema = enumeration(
  'CoverageOverviewRuleActivity',
  CoverageOverviewRuleActivity
);

export enum CoverageOverviewRuleSource {
  Prebuilt = 'prebuilt',
  Custom = 'custom',
  Customized = 'customized',
}
export const CoverageOverviewRuleSourceSchema = enumeration(
  'CoverageOverviewRuleSource',
  CoverageOverviewRuleSource
);

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
