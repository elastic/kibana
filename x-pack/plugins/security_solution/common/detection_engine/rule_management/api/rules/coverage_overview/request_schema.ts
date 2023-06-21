/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { enumeration, NonEmptyArray, NonEmptyString } from '@kbn/securitysolution-io-ts-types';

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
  /**
   * A search term to filter the response by rule name, index pattern, MITRE ATT&CK tactic or technique
   */
  search_term: NonEmptyString,
  /**
   * An activity filter representing an array combined of CoverageOverviewRuleActivity values to include only specified rules in the response
   */
  activity: NonEmptyArray(CoverageOverviewRuleActivitySchema),
  /**
   * A source filter representing an array combined of CoverageOverviewRuleSource values to include only specified rules in the response
   */
  source: NonEmptyArray(CoverageOverviewRuleSourceSchema),
});

export type CoverageOverviewRequestBody = t.TypeOf<typeof CoverageOverviewRequestBody>;
export const CoverageOverviewRequestBody = t.partial({
  filter: CoverageOverviewFilter,
});
