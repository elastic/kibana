/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import type { CspFinding } from '../../../../common/schemas/csp_finding';
import { LATEST_FINDINGS_INDEX_DEFAULT_NS } from '../../../../common/constants';
import { createDetectionRule } from '../../../common/api/create_detection_rule';

const DEFAULT_RULE_RISK_SCORE = 0;
const DEFAULT_RULE_SEVERITY = 'low';
const DEFAULT_RULE_ENABLED = true;
const DEFAULT_RULE_AUTHOR = 'Elastic';
const DEFAULT_RULE_LICENSE = 'Elastic License v2';
const ALERT_SUPPRESSION_FIELD = 'resource.id';
const ALERT_TIMESTAMP_FIELD = 'event.ingested';

enum AlertSuppressionMissingFieldsStrategy {
  // per each document a separate alert will be created
  DoNotSuppress = 'doNotSuppress',
  // only one alert will be created per suppress by bucket
  Suppress = 'suppress',
}

const convertReferencesLinksToArray = (input: string | undefined) => {
  if (!input) {
    return [];
  }
  // Match all URLs in the input string using a regular expression
  const matches = input.match(/(https?:\/\/\S+)/g);

  if (!matches) {
    return [];
  }

  // Remove the numbers and new lines
  return matches.map((link) => link.replace(/^\d+\. /, '').replace(/\n/g, ''));
};

const STATIC_RULE_TAGS = ['Elastic', 'Cloud Security'];

const generateMisconfigurationsTags = (finding: CspFinding) => {
  return [STATIC_RULE_TAGS]
    .concat(finding.rule.tags)
    .concat(
      finding.rule.benchmark.posture_type ? [finding.rule.benchmark.posture_type.toUpperCase()] : []
    )
    .flat();
};

const generateMisconfigurationsRuleQuery = (finding: CspFinding) => {
  return `
    rule.benchmark.rule_number: "${finding.rule.benchmark.rule_number}"
    AND rule.benchmark.id: "${finding.rule.benchmark.id}"
    AND result.evaluation: "failed"
  `;
};

/*
 * Creates a detection rule from a CspFinding
 */
export const createDetectionRuleFromFinding = async (http: HttpSetup, finding: CspFinding) => {
  return await createDetectionRule({
    http,
    rule: {
      type: 'query',
      language: 'kuery',
      license: DEFAULT_RULE_LICENSE,
      author: [DEFAULT_RULE_AUTHOR],
      filters: [],
      false_positives: [],
      risk_score: DEFAULT_RULE_RISK_SCORE,
      risk_score_mapping: [],
      severity: DEFAULT_RULE_SEVERITY,
      severity_mapping: [],
      threat: [],
      interval: '1h',
      from: 'now-7200s',
      to: 'now',
      timestamp_override: ALERT_TIMESTAMP_FIELD,
      timestamp_override_fallback_disabled: false,
      actions: [],
      enabled: DEFAULT_RULE_ENABLED,
      alert_suppression: {
        group_by: [ALERT_SUPPRESSION_FIELD],
        missing_fields_strategy: AlertSuppressionMissingFieldsStrategy.Suppress,
      },
      index: [LATEST_FINDINGS_INDEX_DEFAULT_NS],
      query: generateMisconfigurationsRuleQuery(finding),
      references: convertReferencesLinksToArray(finding.rule.references),
      name: finding.rule.name,
      description: finding.rule.rationale,
      tags: generateMisconfigurationsTags(finding),
    },
  });
};
