/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useEffect } from 'react';
import {
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
  EuiPanel,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { usePreviewPanelContext } from '../context';
import { ExpandableSection } from '../../right/components/expandable_section';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import type { Rule } from '../../../detection_engine/rule_management/logic';
import {
  RULE_PREVIEW_BODY_TEST_ID,
  RULE_PREVIEW_ABOUT_TEST_ID,
  RULE_PREVIEW_DEFINITION_TEST_ID,
  RULE_PREVIEW_SCHEDULE_TEST_ID,
} from './test_ids';
import {
  RULE_PREVIEW_ABOUT_TEXT,
  RULE_PREVIEW_DEFINITION_TEXT,
  RULE_PREVIEW_SCHEDULE_TEXT,
} from './translations';

/**
 * Rule summary on a preview panel on top of the right section of expandable flyout
 */
export const RulePreview: React.FC = memo(() => {
  const { ruleId } = usePreviewPanelContext();
  const [rule, setRule] = useState<Rule | null>(null);

  const { rule: maybeRule, loading } = useRuleWithFallback(ruleId ?? '');

  // persist rule until refresh is complete
  useEffect(() => {
    if (maybeRule != null) {
      setRule(maybeRule);
    }
  }, [maybeRule]);

  if (loading) {
    return <EuiLoadingSpinner />;
  }

  return rule ? (
    <EuiPanel hasShadow={false} data-test-subj={RULE_PREVIEW_BODY_TEST_ID}>
      <EuiTitle>
        <h6>{rule.name}</h6>
      </EuiTitle>
      <EuiHorizontalRule />
      <ExpandableSection
        title={RULE_PREVIEW_ABOUT_TEXT}
        expanded
        data-test-subj={RULE_PREVIEW_ABOUT_TEST_ID}
      >
        <EuiText size="s">{rule.description}</EuiText>
        <EuiSpacer size="s" />
        {'About'}
      </ExpandableSection>
      <EuiSpacer size="m" />
      <ExpandableSection
        title={RULE_PREVIEW_DEFINITION_TEXT}
        expanded={false}
        data-test-subj={RULE_PREVIEW_DEFINITION_TEST_ID}
      >
        {'Definition'}
      </ExpandableSection>
      <EuiSpacer size="m" />
      <ExpandableSection
        title={RULE_PREVIEW_SCHEDULE_TEXT}
        expanded={false}
        data-test-subj={RULE_PREVIEW_SCHEDULE_TEST_ID}
      >
        {'Schedule'}
      </ExpandableSection>
    </EuiPanel>
  ) : null;
});

RulePreview.displayName = 'RulePreview';
