/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSortedCspRulesTemplates } from './get_csp_rule_template';
import { CspRuleTemplate } from '@kbn/cloud-security-posture-plugin/common/types/latest';

describe('getSortedCspRulesTemplates', () => {
  it('sorts by metadata.benchmark.rule_number, invalid semantic version still should still get sorted and empty values should be sorted last', () => {
    const cspRulesTemplates = [
      { metadata: { benchmark: { rule_number: '1.0.0' } } },
      { metadata: { benchmark: { rule_number: '2.0.0' } } },
      { metadata: { benchmark: { rule_number: '1.1.0' } } },
      { metadata: { benchmark: { rule_number: '1.0.1' } } },
      { metadata: { benchmark: { rule_number: 'invalid' } } },
      { metadata: { benchmark: { rule_number: '3.0' } } },
      { metadata: { benchmark: {} } },
    ] as CspRuleTemplate[];

    const sortedCspRulesTemplates = getSortedCspRulesTemplates(cspRulesTemplates);

    expect(sortedCspRulesTemplates).toEqual([
      { metadata: { benchmark: { rule_number: '1.0.0' } } },
      { metadata: { benchmark: { rule_number: '1.0.1' } } },
      { metadata: { benchmark: { rule_number: '1.1.0' } } },
      { metadata: { benchmark: { rule_number: '2.0.0' } } },
      { metadata: { benchmark: { rule_number: '3.0' } } },
      { metadata: { benchmark: { rule_number: 'invalid' } } },
      { metadata: { benchmark: {} } },
    ]);
  });

  it('edge case - returns empty array if input is empty', () => {
    const cspRulesTemplates: CspRuleTemplate[] = [];

    const sortedCspRulesTemplates = getSortedCspRulesTemplates(cspRulesTemplates);

    expect(sortedCspRulesTemplates).toEqual([]);
  });

  it('edge case - returns sorted array even if input only has one element', () => {
    const cspRulesTemplates = [
      { metadata: { benchmark: { rule_number: '1.0.0' } } },
    ] as CspRuleTemplate[];

    const sortedCspRulesTemplates = getSortedCspRulesTemplates(cspRulesTemplates);

    expect(sortedCspRulesTemplates).toEqual([
      { metadata: { benchmark: { rule_number: '1.0.0' } } },
    ]);
  });

  it('returns sorted array even with undefined or null properties', () => {
    const cspRulesTemplates = [
      { metadata: { benchmark: { rule_number: '1.0.0' } } },
      { metadata: { benchmark: { rule_number: undefined } } },
      { metadata: { benchmark: { rule_number: '2.0.0' } } },
      { metadata: { benchmark: { rule_number: null } } },
    ] as CspRuleTemplate[];

    const sortedCspRulesTemplates = getSortedCspRulesTemplates(cspRulesTemplates);

    expect(sortedCspRulesTemplates).toEqual([
      { metadata: { benchmark: { rule_number: '1.0.0' } } },
      { metadata: { benchmark: { rule_number: '2.0.0' } } },
      { metadata: { benchmark: { rule_number: null } } },
      { metadata: { benchmark: { rule_number: undefined } } },
    ]);
  });

  it('returns sorted array with invalid semantic versions', () => {
    const cspRulesTemplates = [
      { metadata: { benchmark: { rule_number: '1.0.0' } } },
      { metadata: { benchmark: { rule_number: '2.0' } } },
      { metadata: { benchmark: { rule_number: '3.0.0' } } },
    ] as CspRuleTemplate[];

    const sortedCspRulesTemplates = getSortedCspRulesTemplates(cspRulesTemplates);

    expect(sortedCspRulesTemplates).toEqual([
      { metadata: { benchmark: { rule_number: '1.0.0' } } },
      { metadata: { benchmark: { rule_number: '2.0' } } },
      { metadata: { benchmark: { rule_number: '3.0.0' } } },
    ]);
  });
});
