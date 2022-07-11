/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImportRulesSchema } from './import_rules_schema';

export const validateTimelineId = (rule: ImportRulesSchema): string[] => {
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

export const validateTimelineTitle = (rule: ImportRulesSchema): string[] => {
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

export const validateThreshold = (rule: ImportRulesSchema): string[] => {
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

export const importRuleValidateTypeDependents = (rule: ImportRulesSchema): string[] => {
  return [...validateTimelineId(rule), ...validateTimelineTitle(rule), ...validateThreshold(rule)];
};
