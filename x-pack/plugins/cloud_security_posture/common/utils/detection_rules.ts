/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CspBenchmarkRuleMetadata } from '../types/latest';

const CSP_RULE_TAG = 'Cloud Security';
const CSP_RULE_TAG_USE_CASE = 'Use Case: Configuration Audit';
const CSP_RULE_TAG_DATA_SOURCE_PREFIX = 'Data Source: ';

const STATIC_RULE_TAGS = [CSP_RULE_TAG, CSP_RULE_TAG_USE_CASE];

export const convertRuleTagsToMatchAllKQL = (tags: string[]): string => {
  const TAGS_FIELD = 'alert.attributes.tags';
  return `${TAGS_FIELD}:(${tags.map((tag) => `"${tag}"`).join(` AND `)})`;
};

export const convertRuleTagsToMatchAnyKQL = (tags: string[]): string => {
  const TAGS_FIELD = 'alert.attributes.tags';
  return `${TAGS_FIELD}:(${tags.map((tag) => `"${tag}"`).join(` OR `)})`;
};

/*
 * Returns an array of CspFinding tags that can be used to search and filter a detection rule
 */
export const getFindingsDetectionRuleSearchTags = (
  cspBenchmarkRule: CspBenchmarkRuleMetadata
): string[] => {
  if (!cspBenchmarkRule?.benchmark || !cspBenchmarkRule?.benchmark?.id) {
    // Return an empty array if benchmark ID is undefined
    return [];
  }

  // ex: cis_gcp to ['CIS', 'GCP']
  const benchmarkIdTags = cspBenchmarkRule.benchmark.id.split('_').map((tag) => tag.toUpperCase());

  // ex: 'CIS GCP 1.1'
  const benchmarkRuleNumberTag = cspBenchmarkRule.benchmark.rule_number
    ? `${cspBenchmarkRule.benchmark.id.replace('_', ' ').toUpperCase()} ${
        cspBenchmarkRule.benchmark.rule_number
      }`
    : cspBenchmarkRule.benchmark.id.replace('_', ' ').toUpperCase();

  return benchmarkIdTags.concat([benchmarkRuleNumberTag]);
};

export const getFindingsDetectionRuleSearchTagsFromArrayOfRules = (
  cspBenchmarkRules: CspBenchmarkRuleMetadata[]
): string[] => {
  if (
    !cspBenchmarkRules ||
    !cspBenchmarkRules.some((rule) => rule.benchmark) ||
    !cspBenchmarkRules.some((rule) => rule.benchmark.id)
  ) {
    return [];
  }

  // we can just take the first benchmark id because we Know that the array will ONLY contain 1 kind of id
  const benchmarkIds = cspBenchmarkRules.map((rule) => rule.benchmark.id);
  if (benchmarkIds.length === 0) return [];
  const benchmarkId = benchmarkIds[0];
  const benchmarkRuleNumbers = cspBenchmarkRules.map((rule) => rule.benchmark.rule_number);
  if (benchmarkRuleNumbers.length === 0) return [];
  const benchmarkTagArray = benchmarkRuleNumbers.map(
    (tag) => benchmarkId.replace('_', ' ').toUpperCase() + ' ' + tag
  );
  // we want the tags to only consist of a format like this CIS AWS 1.1.0
  return benchmarkTagArray;
};

export const generateBenchmarkRuleTags = (rule: CspBenchmarkRuleMetadata) => {
  return [STATIC_RULE_TAGS]
    .concat(getFindingsDetectionRuleSearchTags(rule))
    .concat(
      rule.benchmark.posture_type
        ? [
            rule.benchmark.posture_type.toUpperCase(),
            `${CSP_RULE_TAG_DATA_SOURCE_PREFIX}${rule.benchmark.posture_type.toUpperCase()}`,
          ]
        : []
    )
    .concat(rule.benchmark.posture_type === 'cspm' ? ['Domain: Cloud'] : ['Domain: Container'])
    .flat();
};
