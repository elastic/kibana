/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CspFinding } from '../../../../common/schemas/csp_finding';

const CSP_RULE_TAG = 'Cloud Security';
const CNVM_RULE_TAG_USE_CASE = 'Use Case: Configuration Audit';
const CNVM_RULE_TAG_DATA_SOURCE_PREFIX = 'Data Source: ';

const STATIC_RULE_TAGS = [CSP_RULE_TAG, CNVM_RULE_TAG_USE_CASE];

export const generateFindingsTags = (finding: CspFinding) => {
  return [STATIC_RULE_TAGS]
    .concat(finding.rule.tags)
    .concat(
      finding.rule.benchmark.posture_type
        ? [
            `${CNVM_RULE_TAG_DATA_SOURCE_PREFIX}${finding.rule.benchmark.posture_type.toUpperCase()}`,
          ]
        : []
    )
    .concat(
      finding.rule.benchmark.posture_type === 'cspm' ? ['Domain: Cloud'] : ['Domain: Container']
    )
    .flat();
};
