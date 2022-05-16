/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isMlRule } from '../../../machine_learning/helpers';
import { isThresholdRule } from '../../utils';
import { AddPrepackagedRulesSchema } from './add_prepackaged_rules_schema';

export const validateAnomalyThreshold = (rule: AddPrepackagedRulesSchema): string[] => {
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

export const validateQuery = (rule: AddPrepackagedRulesSchema): string[] => {
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

export const validateLanguage = (rule: AddPrepackagedRulesSchema): string[] => {
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

export const validateSavedId = (rule: AddPrepackagedRulesSchema): string[] => {
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

export const validateMachineLearningJobId = (rule: AddPrepackagedRulesSchema): string[] => {
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

export const validateTimelineId = (rule: AddPrepackagedRulesSchema): string[] => {
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

export const validateTimelineTitle = (rule: AddPrepackagedRulesSchema): string[] => {
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

export const validateThreshold = (rule: AddPrepackagedRulesSchema): string[] => {
  const errors: string[] = [];
  if (isThresholdRule(rule.type)) {
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

export const addPrepackagedRuleValidateTypeDependents = (
  rule: AddPrepackagedRulesSchema
): string[] => {
  return [
    ...validateAnomalyThreshold(rule),
    ...validateQuery(rule),
    ...validateLanguage(rule),
    ...validateSavedId(rule),
    ...validateMachineLearningJobId(rule),
    ...validateTimelineId(rule),
    ...validateTimelineTitle(rule),
    ...validateThreshold(rule),
  ];
};
