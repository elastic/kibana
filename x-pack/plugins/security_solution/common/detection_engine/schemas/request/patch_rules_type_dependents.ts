/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PatchRulesSchema } from './patch_rules_schema';

export const validateQuery = (rule: PatchRulesSchema): string[] => {
  if (rule.type === 'machine_learning') {
    if (rule.query != null) {
      return ['when "type" is "machine_learning", "query" cannot be set'];
    } else {
      return [];
    }
  } else {
    return [];
  }
};

export const validateLanguage = (rule: PatchRulesSchema): string[] => {
  if (rule.type === 'machine_learning') {
    if (rule.language != null) {
      return ['when "type" is "machine_learning", "language" cannot be set'];
    } else {
      return [];
    }
  } else {
    return [];
  }
};

export const validateTimelineId = (rule: PatchRulesSchema): string[] => {
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

export const validateTimelineTitle = (rule: PatchRulesSchema): string[] => {
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

export const validateId = (rule: PatchRulesSchema): string[] => {
  if (rule.id != null && rule.rule_id != null) {
    return ['both "id" and "rule_id" cannot exist, choose one or the other'];
  } else if (rule.id == null && rule.rule_id == null) {
    return ['either "id" or "rule_id" must be set'];
  } else {
    return [];
  }
};

export const validateThreshold = (rule: PatchRulesSchema): string[] => {
  if (rule.type === 'threshold') {
    if (!rule.threshold) {
      return ['when "type" is "threshold", "threshold" is required'];
    } else if (rule.threshold.value <= 0) {
      return ['"threshold.value" has to be bigger than 0'];
    } else {
      return [];
    }
  }
  return [];
};

export const patchRuleValidateTypeDependents = (schema: PatchRulesSchema): string[] => {
  return [
    ...validateId(schema),
    ...validateQuery(schema),
    ...validateLanguage(schema),
    ...validateTimelineId(schema),
    ...validateTimelineTitle(schema),
    ...validateThreshold(schema),
  ];
};
