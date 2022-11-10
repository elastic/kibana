/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleCreateProps } from '../../../../../rule_schema';

/**
 * Additional validation that is implemented outside of the schema itself.
 */
export const validateCreateRuleProps = (props: RuleCreateProps): string[] => {
  return [
    ...validateTimelineId(props),
    ...validateTimelineTitle(props),
    ...validateThreatMapping(props),
    ...validateThreshold(props),
  ];
};

const validateTimelineId = (props: RuleCreateProps): string[] => {
  if (props.timeline_id != null) {
    if (props.timeline_title == null) {
      return ['when "timeline_id" exists, "timeline_title" must also exist'];
    } else if (props.timeline_id === '') {
      return ['"timeline_id" cannot be an empty string'];
    } else {
      return [];
    }
  }
  return [];
};

const validateTimelineTitle = (props: RuleCreateProps): string[] => {
  if (props.timeline_title != null) {
    if (props.timeline_id == null) {
      return ['when "timeline_title" exists, "timeline_id" must also exist'];
    } else if (props.timeline_title === '') {
      return ['"timeline_title" cannot be an empty string'];
    } else {
      return [];
    }
  }
  return [];
};

const validateThreatMapping = (props: RuleCreateProps): string[] => {
  const errors: string[] = [];
  if (props.type === 'threat_match') {
    if (props.concurrent_searches != null && props.items_per_search == null) {
      errors.push('when "concurrent_searches" exists, "items_per_search" must also exist');
    }
    if (props.concurrent_searches == null && props.items_per_search != null) {
      errors.push('when "items_per_search" exists, "concurrent_searches" must also exist');
    }
  }
  return errors;
};

const validateThreshold = (props: RuleCreateProps): string[] => {
  const errors: string[] = [];
  if (props.type === 'threshold') {
    if (!props.threshold) {
      errors.push('when "type" is "threshold", "threshold" is required');
    } else {
      if (
        props.threshold.cardinality?.length &&
        props.threshold.field.includes(props.threshold.cardinality[0].field)
      ) {
        errors.push('Cardinality of a field that is being aggregated on is always 1');
      }
      if (Array.isArray(props.threshold.field) && props.threshold.field.length > 3) {
        errors.push('Number of fields must be 3 or less');
      }
    }
  }
  return errors;
};
