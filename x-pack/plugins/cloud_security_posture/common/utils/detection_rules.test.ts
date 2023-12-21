/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CspBenchmarkRuleMetadata } from '../types';
import {
  convertRuleTagsToKQL,
  generateBenchmarkRuleTags,
  getFindingsDetectionRuleSearchTags,
} from './detection_rules';

describe('Tests detection rules utils', () => {
  // Test case:
  it('should convert tags to KQL format', () => {
    const inputTags = ['tag1', 'tag2', 'tag3'];

    const result = convertRuleTagsToKQL(inputTags);

    const expectedKQL = 'alert.attributes.tags:("tag1" AND "tag2" AND "tag3")';
    expect(result).toBe(expectedKQL);
  });

  it('should generate search tags for a CSP benchmark rule', () => {
    // Arrange: Create a sample CSP benchmark rule
    const cspBenchmarkRule = {
      benchmark: {
        id: 'cis_gcp',
        rule_number: '1.1',
      },
    } as unknown as CspBenchmarkRuleMetadata;

    const result = getFindingsDetectionRuleSearchTags(cspBenchmarkRule);

    const expectedTags = ['CIS', 'GCP', 'CIS GCP 1.1'];
    expect(result).toEqual(expectedTags);
  });

  it('should generate tags for a CSP benchmark rule', () => {
    const cspBenchmarkRule = {
      benchmark: {
        id: 'cis_gcp',
        rule_number: '1.1',
        posture_type: 'cspm',
      },
    } as unknown as CspBenchmarkRuleMetadata;

    const result = generateBenchmarkRuleTags(cspBenchmarkRule);

    const expectedTags = [
      'Cloud Security',
      'Use Case: Configuration Audit',
      'CIS',
      'GCP',
      'CIS GCP 1.1',
      'CSPM',
      'Data Source: CSPM',
      'Domain: Cloud',
    ];
    expect(result).toEqual(expectedTags);
  });
});
