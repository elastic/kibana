/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateRulesSchema } from './rule_schemas';

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

export const validateThreatMapping = (rule: CreateRulesSchema): string[] => {
  let errors: string[] = [];
  if (rule.type === 'threat_match') {
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
    ...validateTimelineId(schema),
    ...validateTimelineTitle(schema),
    ...validateThreatMapping(schema),
  ];
};
