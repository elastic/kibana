/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRulesSchema } from '../../../../schemas/request/rule_schemas';

/**
 * Additional validation that is implemented outside of the schema itself.
 */
export const validateCreateRuleSchema = (rule: CreateRulesSchema): string[] => {
  return [
    ...validateTimelineId(rule),
    ...validateTimelineTitle(rule),
    ...validateThreatMapping(rule),
    ...validateThreshold(rule),
  ];
};

const validateTimelineId = (rule: CreateRulesSchema): string[] => {
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

const validateTimelineTitle = (rule: CreateRulesSchema): string[] => {
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

const validateThreatMapping = (rule: CreateRulesSchema): string[] => {
  const errors: string[] = [];
  if (rule.type === 'threat_match') {
    if (rule.concurrent_searches != null && rule.items_per_search == null) {
      errors.push('when "concurrent_searches" exists, "items_per_search" must also exist');
    }
    if (rule.concurrent_searches == null && rule.items_per_search != null) {
      errors.push('when "items_per_search" exists, "concurrent_searches" must also exist');
    }
  }
  return errors;
};

const validateThreshold = (rule: CreateRulesSchema): string[] => {
  const errors: string[] = [];
  if (rule.type === 'threshold') {
    if (!rule.threshold) {
      errors.push('when "type" is "threshold", "threshold" is required');
    } else {
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
  }
  return errors;
};
