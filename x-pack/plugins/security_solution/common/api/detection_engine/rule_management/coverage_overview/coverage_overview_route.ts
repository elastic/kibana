/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { enumeration, NonEmptyArray, NonEmptyString } from '@kbn/securitysolution-io-ts-types';

/**
 * Rule activity (status) filter applicable to two groups of rules
 * - installed from a Fleet package, custom and customized which are installed but customized later on which
 *  can be either enabled or disabled
 * - available to be installed from a Fleet package rules
 */
export enum CoverageOverviewRuleActivity {
  /**
   * Enabled rules (installed from a Fleet package, custom or customized)
   */
  Enabled = 'enabled',
  /**
   * Disabled rules (installed from a Fleet package, custom or customized)
   */
  Disabled = 'disabled',
  /**
   * Available to be installed from a Fleet package rules (Elastic prebuilt rules)
   */
  Available = 'available',
}
export const CoverageOverviewRuleActivitySchema = enumeration(
  'CoverageOverviewRuleActivity',
  CoverageOverviewRuleActivity
);

/**
 * Rule source (origin) filter representing from where the rules came from
 */
export enum CoverageOverviewRuleSource {
  /**
   * Rules installed from a Fleet package of Elastic prebuilt rules
   */
  Prebuilt = 'prebuilt',
  /**
   * Rules created manually
   */
  Custom = 'custom',
  /**
   * Rules installed from a Fleet package but modified later on
   */
  Customized = 'customized',
}
export const CoverageOverviewRuleSourceSchema = enumeration(
  'CoverageOverviewRuleSource',
  CoverageOverviewRuleSource
);

export type CoverageOverviewFilter = t.TypeOf<typeof CoverageOverviewFilter>;
export const CoverageOverviewFilter = t.partial({
  /**
   * A search term to filter the response by rule name, index pattern, MITRE ATT&CK™ tactic or technique
   *
   * @example "Defense Evasion" or "TA0005"
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
export const CoverageOverviewRequestBody = t.exact(
  t.partial({
    filter: CoverageOverviewFilter,
  })
);

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
