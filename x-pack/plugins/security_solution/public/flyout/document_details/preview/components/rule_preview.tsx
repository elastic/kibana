/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useState, useEffect } from 'react';
import { EuiText, EuiHorizontalRule, EuiSpacer, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/css';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePreviewPanelContext } from '../context';
import { ExpandableSection } from '../../right/components/expandable_section';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { getStepsData } from '../../../../detections/pages/detection_engine/rules/helpers';
import { RulePreviewTitle } from './rule_preview_title';
import { RuleAboutSection } from '../../../../detection_engine/rule_management/components/rule_details/rule_about_section';
import { RuleScheduleSection } from '../../../../detection_engine/rule_management/components/rule_details/rule_schedule_section';
import { RuleDefinitionSection } from '../../../../detection_engine/rule_management/components/rule_details/rule_definition_section';
import { StepRuleActionsReadOnly } from '../../../../detection_engine/rule_creation/components/step_rule_actions';
import { FlyoutLoading } from '../../../shared/components/flyout_loading';
import { FlyoutError } from '../../../shared/components/flyout_error';
import {
  RULE_PREVIEW_BODY_TEST_ID,
  RULE_PREVIEW_ABOUT_TEST_ID,
  RULE_PREVIEW_DEFINITION_TEST_ID,
  RULE_PREVIEW_SCHEDULE_TEST_ID,
  RULE_PREVIEW_ACTIONS_TEST_ID,
  RULE_PREVIEW_LOADING_TEST_ID,
} from './test_ids';
import type { RuleResponse } from '../../../../../common/api/detection_engine';

const panelViewStyle = css`
  dt {
    font-size: 90% !important;
  }
  text-overflow: ellipsis;
  .euiFlexGroup {
    flex-wrap: inherit;
  }

  .euiFlexItem {
    inline-size: inherit;
    flex-basis: inherit;
  }
`;

/**
 * Rule summary on a preview panel on top of the right section of expandable flyout
 */
export const RulePreview: React.FC = memo(() => {
  const { ruleId } = usePreviewPanelContext();
  const [rule, setRule] = useState<RuleResponse | null>(null);
  const {
    rule: maybeRule,
    loading: ruleLoading,
    isExistingRule,
  } = useRuleWithFallback(ruleId ?? '');

  // persist rule until refresh is complete
  useEffect(() => {
    if (maybeRule != null) {
      setRule(maybeRule);
    }
  }, [maybeRule]);

  const { ruleActionsData } =
    rule != null ? getStepsData({ rule, detailsView: true }) : { ruleActionsData: null };

  const hasNotificationActions = Boolean(ruleActionsData?.actions?.length);
  const hasResponseActions = Boolean(ruleActionsData?.responseActions?.length);
  const hasActions = ruleActionsData != null && (hasNotificationActions || hasResponseActions);

  return ruleLoading ? (
    <FlyoutLoading data-test-subj={RULE_PREVIEW_LOADING_TEST_ID} />
  ) : rule ? (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      data-test-subj={RULE_PREVIEW_BODY_TEST_ID}
      className="eui-yScroll"
    >
      <RulePreviewTitle rule={rule} isSuppressed={!isExistingRule} />
      <EuiHorizontalRule margin="s" />
      <EuiSpacer size="s" />
      <ExpandableSection
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.preview.rule.aboutLabel"
            defaultMessage="About"
          />
        }
        expanded
        data-test-subj={RULE_PREVIEW_ABOUT_TEST_ID}
      >
        <EuiText size="s">{rule.description}</EuiText>
        <EuiSpacer size="s" />
        <RuleAboutSection
          rule={rule}
          hideName
          hideDescription
          type="row"
          rowGutterSize="s"
          className={panelViewStyle}
        />
      </ExpandableSection>
      <EuiHorizontalRule margin="l" />
      <ExpandableSection
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.preview.rule.definitionLabel"
            defaultMessage="Definition"
          />
        }
        expanded={false}
        data-test-subj={RULE_PREVIEW_DEFINITION_TEST_ID}
      >
        <RuleDefinitionSection
          rule={rule}
          type="row"
          rowGutterSize="s"
          className={panelViewStyle}
        />
      </ExpandableSection>
      <EuiHorizontalRule margin="l" />
      <ExpandableSection
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.preview.rule.scheduleLabel"
            defaultMessage="Schedule"
          />
        }
        expanded={false}
        data-test-subj={RULE_PREVIEW_SCHEDULE_TEST_ID}
      >
        <RuleScheduleSection rule={rule} type="row" rowGutterSize="s" className={panelViewStyle} />
      </ExpandableSection>
      <EuiHorizontalRule margin="l" />
      {hasActions && (
        <ExpandableSection
          title={
            <FormattedMessage
              id="xpack.securitySolution.flyout.preview.rule.actionsLabel"
              defaultMessage="Actions"
            />
          }
          expanded={false}
          data-test-subj={RULE_PREVIEW_ACTIONS_TEST_ID}
        >
          <StepRuleActionsReadOnly addPadding={false} defaultValues={ruleActionsData} />
        </ExpandableSection>
      )}
    </EuiPanel>
  ) : (
    <EuiPanel hasBorder={false} hasShadow={false}>
      <FlyoutError />
    </EuiPanel>
  );
});

RulePreview.displayName = 'RulePreview';
