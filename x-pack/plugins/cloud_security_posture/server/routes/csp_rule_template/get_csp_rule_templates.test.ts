/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getSortedCspRulesTemplates } from './get_csp_rule_template';
import { CspRuleTemplate } from '../../../common/schemas';
describe('getSortedCspRulesTemplates', () => {
  it('should return a sorted array of CspRuleTemplate objects based on their metadata.benchmark.rule_number property', () => {
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

  it('should return an empty array when passed an empty array', () => {
    const cspRulesTemplates: CspRuleTemplate[] = [];

    const sortedCspRulesTemplates = getSortedCspRulesTemplates(cspRulesTemplates);

    expect(sortedCspRulesTemplates).toEqual([]);
  });

  it('should return a sorted array of CspRuleTemplate objects when passed an array with one element', () => {
    const cspRulesTemplates = [
      { metadata: { benchmark: { rule_number: '1.0.0' } } },
    ] as CspRuleTemplate[];

    const sortedCspRulesTemplates = getSortedCspRulesTemplates(cspRulesTemplates);

    expect(sortedCspRulesTemplates).toEqual([
      { metadata: { benchmark: { rule_number: '1.0.0' } } },
    ]);
  });

  it('should return a sorted array of CspRuleTemplate objects when passed an array with multiple elements, some of which have undefined or null metadata.benchmark.rule_number properties', () => {
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

  it('should return a sorted array of CspRuleTemplate objects when passed an array with multiple elements, some of which have metadata.benchmark.rule_number properties that are not valid semver strings', () => {
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
