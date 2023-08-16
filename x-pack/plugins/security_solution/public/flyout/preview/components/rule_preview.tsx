/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useState, useEffect } from 'react';
import { EuiText, EuiHorizontalRule, EuiSpacer, EuiPanel, EuiLoadingSpinner } from '@elastic/eui';
import type { Rule } from '../../../detection_engine/rule_management/logic';
import { usePreviewPanelContext } from '../context';
import { ExpandableSection } from '../../right/components/expandable_section';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { getStepsData } from '../../../detections/pages/detection_engine/rules/helpers';
import { RulePreviewTitle } from './rule_preview_title';
import { StepAboutRuleReadOnly } from '../../../detections/components/rules/step_about_rule';
import { StepDefineRuleReadOnly } from '../../../detections/components/rules/step_define_rule';
import { StepScheduleRuleReadOnly } from '../../../detections/components/rules/step_schedule_rule';
import { StepRuleActionsReadOnly } from '../../../detections/components/rules/step_rule_actions';
import {
  RULE_PREVIEW_BODY_TEST_ID,
  RULE_PREVIEW_ABOUT_TEST_ID,
  RULE_PREVIEW_DEFINITION_TEST_ID,
  RULE_PREVIEW_SCHEDULE_TEST_ID,
  RULE_PREVIEW_ACTIONS_TEST_ID,
  RULE_PREVIEW_LOADING_TEST_ID,
} from './test_ids';
import * as i18n from './translations';

/**
 * Rule summary on a preview panel on top of the right section of expandable flyout
 */
export const RulePreview: React.FC = memo(() => {
  const { ruleId, indexPattern } = usePreviewPanelContext();
  const [rule, setRule] = useState<Rule | null>(null);
  const { rule: maybeRule, loading: ruleLoading } = useRuleWithFallback(ruleId ?? '');

  // persist rule until refresh is complete
  useEffect(() => {
    if (maybeRule != null) {
      setRule(maybeRule);
    }
  }, [maybeRule]);

  const { aboutRuleData, defineRuleData, scheduleRuleData, ruleActionsData } =
    rule != null
      ? getStepsData({ rule, detailsView: true })
      : {
          aboutRuleData: null,
          defineRuleData: null,
          scheduleRuleData: null,
          ruleActionsData: null,
        };

  const hasNotificationActions = Boolean(ruleActionsData?.actions?.length);
  const hasResponseActions = Boolean(ruleActionsData?.responseActions?.length);
  const hasActions = ruleActionsData != null && (hasNotificationActions || hasResponseActions);

  return rule ? (
    <EuiPanel hasShadow={false} data-test-subj={RULE_PREVIEW_BODY_TEST_ID} className="eui-yScroll">
      <RulePreviewTitle rule={rule} />
      <EuiHorizontalRule margin="s" />
      <ExpandableSection
        title={i18n.RULE_PREVIEW_ABOUT_TEXT}
        expanded
        data-test-subj={RULE_PREVIEW_ABOUT_TEST_ID}
      >
        <EuiText size="s">{rule.description}</EuiText>
        <EuiSpacer size="s" />
        {aboutRuleData && (
          <StepAboutRuleReadOnly
            addPadding={false}
            descriptionColumns="single"
            defaultValues={aboutRuleData}
            isInPanelView
          />
        )}
      </ExpandableSection>
      <EuiHorizontalRule margin="l" />
      {defineRuleData && (
        <>
          <ExpandableSection
            title={i18n.RULE_PREVIEW_DEFINITION_TEXT}
            expanded={false}
            data-test-subj={RULE_PREVIEW_DEFINITION_TEST_ID}
          >
            <StepDefineRuleReadOnly
              addPadding={false}
              descriptionColumns="single"
              defaultValues={defineRuleData}
              indexPattern={indexPattern}
              isInPanelView
            />
          </ExpandableSection>
          <EuiHorizontalRule margin="l" />
        </>
      )}
      {scheduleRuleData && (
        <>
          <ExpandableSection
            title={i18n.RULE_PREVIEW_SCHEDULE_TEXT}
            expanded={false}
            data-test-subj={RULE_PREVIEW_SCHEDULE_TEST_ID}
          >
            <StepScheduleRuleReadOnly
              addPadding={false}
              descriptionColumns="single"
              defaultValues={scheduleRuleData}
              isInPanelView
            />
          </ExpandableSection>
          <EuiHorizontalRule margin="l" />
        </>
      )}
      {hasActions && (
        <ExpandableSection
          title={i18n.RULE_PREVIEW_ACTIONS_TEXT}
          expanded={false}
          data-test-subj={RULE_PREVIEW_ACTIONS_TEST_ID}
        >
          <StepRuleActionsReadOnly addPadding={false} defaultValues={ruleActionsData} />
        </ExpandableSection>
      )}
    </EuiPanel>
  ) : ruleLoading ? (
    <EuiLoadingSpinner size="l" data-test-subj={RULE_PREVIEW_LOADING_TEST_ID} />
  ) : null;
});

RulePreview.displayName = 'RulePreview';
