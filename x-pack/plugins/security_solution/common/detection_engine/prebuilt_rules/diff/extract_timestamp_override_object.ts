/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../api/detection_engine/model/rule_schema';
import type { TimestampOverrideObject } from '../../../api/detection_engine/prebuilt_rules';

export const extractTimestampOverrideObject = (
  rule: RuleResponse
): TimestampOverrideObject | undefined => {
  if (rule.timestamp_override == null) {
    return undefined;
  }
  return {
    field_name: rule.timestamp_override,
    fallback_disabled: rule.timestamp_override_fallback_disabled ?? false,
  };
};
