/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleToImport } from './rule_to_import';

/**
 * Additional validation that is implemented outside of the schema itself.
 */
export const validateRuleToImport = (rule: RuleToImport): string[] => {
  return [...validateTimelineId(rule), ...validateTimelineTitle(rule), ...validateThreshold(rule)];
};

const validateTimelineId = (rule: RuleToImport): string[] => {
  if (rule.timeline_id != null) {
    if (rule.timeline_title == null) {
      return ['when "timeline_id" exists, "timeline_title" must also exist'];
    } else if (rule.timeline_id === '') {
      return ['"timeline_id" cannot be an empty string'];
    } else {
      return [];
    }
  }
  return [];
};

const validateTimelineTitle = (rule: RuleToImport): string[] => {
  if (rule.timeline_title != null) {
    if (rule.timeline_id == null) {
      return ['when "timeline_title" exists, "timeline_id" must also exist'];
    } else if (rule.timeline_title === '') {
      return ['"timeline_title" cannot be an empty string'];
    } else {
      return [];
    }
  }
  return [];
};

const validateThreshold = (rule: RuleToImport): string[] => {
  const errors: string[] = [];
  if (rule.type === 'threshold') {
    if (
      rule.threshold.cardinality?.length &&
      rule.threshold.field.includes(rule.threshold.cardinality[0].field)
    ) {
      errors.push('Cardinality of a field that is being aggregated on is always 1');
    }
    if (Array.isArray(rule.threshold.field) && rule.threshold.field.length > 3) {
      errors.push('Number of fields must be 3 or less');
    }
  }
  return errors;
};
