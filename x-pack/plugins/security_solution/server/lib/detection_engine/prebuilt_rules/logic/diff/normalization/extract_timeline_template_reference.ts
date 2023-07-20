/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { TimelineTemplateReference } from '../../../../../../../common/api/detection_engine/prebuilt_rules';
import type { PrebuiltRuleAsset } from '../../../model/rule_assets/prebuilt_rule_asset';

export const extractTimelineTemplateReference = (
  rule: RuleResponse | PrebuiltRuleAsset
): TimelineTemplateReference | undefined => {
  if (rule.timeline_id == null) {
    return undefined;
  }
  return {
    timeline_id: rule.timeline_id,
    timeline_title: rule.timeline_title ?? '',
  };
};
