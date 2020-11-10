/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isMlRule } from '../../../machine_learning/helpers';
import { isThreatMatchRule, isThresholdRule } from '../../utils';
import { CreateRulesSchema } from './create_rules_schema';

export const validateAnomalyThreshold = (rule: CreateRulesSchema): string[] => {
  if (isMlRule(rule.type)) {
    if (rule.anomaly_threshold == null) {
      return ['when "type" is "machine_learning" anomaly_threshold is required'];
    } else {
      return [];
    }
  } else {
    return [];
  }
};

export const validateQuery = (rule: CreateRulesSchema): string[] => {
  if (isMlRule(rule.type)) {
    if (rule.query != null) {
      return ['when "type" is "machine_learning", "query" cannot be set'];
    } else {
      return [];
    }
  } else {
    return [];
  }
};

export const validateLanguage = (rule: CreateRulesSchema): string[] => {
  if (isMlRule(rule.type)) {
    if (rule.language != null) {
      return ['when "type" is "machine_learning", "language" cannot be set'];
    } else {
      return [];
    }
  } else {
    return [];
  }
};

export const validateSavedId = (rule: CreateRulesSchema): string[] => {
  if (rule.type === 'saved_query') {
    if (rule.saved_id == null) {
      return ['when "type" is "saved_query", "saved_id" is required'];
    } else {
      return [];
    }
  } else {
    return [];
  }
};

export const validateMachineLearningJobId = (rule: CreateRulesSchema): string[] => {
  if (isMlRule(rule.type)) {
    if (rule.machine_learning_job_id == null) {
      return ['when "type" is "machine_learning", "machine_learning_job_id" is required'];
    } else {
      return [];
    }
  } else {
    return [];
  }
};

export const validateTimelineId = (rule: CreateRulesSchema): string[] => {
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

export const validateTimelineTitle = (rule: CreateRulesSchema): string[] => {
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

export const validateThreshold = (rule: CreateRulesSchema): string[] => {
  if (isThresholdRule(rule.type)) {
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

export const validateThreatMapping = (rule: CreateRulesSchema): string[] => {
  let errors: string[] = [];
  if (isThreatMatchRule(rule.type)) {
    if (rule.threat_mapping == null) {
      errors = ['when "type" is "threat_match", "threat_mapping" is required', ...errors];
    } else if (rule.threat_mapping.length === 0) {
      errors = ['threat_mapping" must have at least one element', ...errors];
    }
    if (rule.threat_query == null) {
      errors = ['when "type" is "threat_match", "threat_query" is required', ...errors];
    }
    if (rule.threat_index == null) {
      errors = ['when "type" is "threat_match", "threat_index" is required', ...errors];
    }
    if (rule.concurrent_searches == null && rule.items_per_search != null) {
      errors = ['when "items_per_search" exists, "concurrent_searches" must also exist', ...errors];
    }
    if (rule.concurrent_searches != null && rule.items_per_search == null) {
      errors = ['when "concurrent_searches" exists, "items_per_search" must also exist', ...errors];
    }
  }
  return errors;
};

export const createRuleValidateTypeDependents = (schema: CreateRulesSchema): string[] => {
  return [
    ...validateAnomalyThreshold(schema),
    ...validateQuery(schema),
    ...validateLanguage(schema),
    ...validateSavedId(schema),
    ...validateMachineLearningJobId(schema),
    ...validateTimelineId(schema),
    ...validateTimelineTitle(schema),
    ...validateThreshold(schema),
    ...validateThreatMapping(schema),
  ];
};
