/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRuleToInstall } from './prebuilt_rule';

export const addPrepackagedRuleValidateTypeDependents = (rule: PrebuiltRuleToInstall): string[] => {
  return [...validateTimelineId(rule), ...validateTimelineTitle(rule), ...validateThreshold(rule)];
};

const validateTimelineId = (rule: PrebuiltRuleToInstall): string[] => {
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

const validateTimelineTitle = (rule: PrebuiltRuleToInstall): string[] => {
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

const validateThreshold = (rule: PrebuiltRuleToInstall): string[] => {
  const errors: string[] = [];
  if (rule.type === 'threshold') {
    if (!rule.threshold) {
      errors.push('when "type" is "threshold", "threshold" is required');
    } else {
      if (rule.threshold.value <= 0) {
        errors.push('"threshold.value" has to be bigger than 0');
      }
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
