/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import * as i18n from './translations';
import { isCustomizedPrebuiltRule } from '../../../../../common/api/detection_engine';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { useIsPrebuiltRulesCustomizationEnabled } from '../../hooks/use_is_prebuilt_rules_customization_enabled';

interface CustomizedPrebuiltRuleBadgeProps {
  rule: RuleResponse | null;
}

export const CustomizedPrebuiltRuleBadge: React.FC<CustomizedPrebuiltRuleBadgeProps> = ({
  rule,
}) => {
  const isPrebuiltRulesCustomizationEnabled = useIsPrebuiltRulesCustomizationEnabled();

  if (!isPrebuiltRulesCustomizationEnabled) {
    return null;
  }

  if (rule === null || !isCustomizedPrebuiltRule(rule)) {
    return null;
  }

  return <EuiBadge color="hollow">{i18n.MODIFIED_PREBUILT_RULE_LABEL}</EuiBadge>;
};
