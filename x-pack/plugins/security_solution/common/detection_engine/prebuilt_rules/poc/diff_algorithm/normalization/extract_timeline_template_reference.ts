/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../rule_schema';
import type { PrebuiltRuleContent } from '../../content_model/prebuilt_rule_content';
import type { TimelineTemplateReference } from '../../diffable_rule_model/diffable_field_types';

export const extractTimelineTemplateReference = (
  rule: RuleResponse | PrebuiltRuleContent
): TimelineTemplateReference | undefined => {
  if (rule.timeline_id == null) {
    return undefined;
  }
  return {
    timeline_id: rule.timeline_id,
    timeline_title: rule.timeline_title ?? '',
  };
};
