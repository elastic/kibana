/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useState, useEffect } from 'react';
import { EuiText, EuiHorizontalRule, EuiSpacer, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../common/lib/kibana';
import { useGetSavedQuery } from '../../../../detections/pages/detection_engine/rules/use_get_saved_query';
import type { Rule } from '../../../../detection_engine/rule_management/logic';
import { usePreviewPanelContext } from '../context';
import { ExpandableSection } from '../../right/components/expandable_section';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { getStepsData } from '../../../../detections/pages/detection_engine/rules/helpers';
import { RulePreviewTitle } from './rule_preview_title';
import { StepAboutRuleReadOnly } from '../../../../detections/components/rules/step_about_rule';
import { StepDefineRuleReadOnly } from '../../../../detections/components/rules/step_define_rule';
import { StepScheduleRuleReadOnly } from '../../../../detections/components/rules/step_schedule_rule';
import { StepRuleActionsReadOnly } from '../../../../detections/components/rules/step_rule_actions';
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

/**
 * Rule summary on a preview panel on top of the right section of expandable flyout
 */
export const RulePreview: React.FC = memo(() => {
  const { ruleId, indexPattern } = usePreviewPanelContext();
  const [rule, setRule] = useState<Rule | null>(null);
  const {
    rule: maybeRule,
    loading: ruleLoading,
    isExistingRule,
  } = useRuleWithFallback(ruleId ?? '');
  const { data } = useKibana().services;

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

  const [dataViewTitle, setDataViewTitle] = useState<string>();

  useEffect(() => {
    const fetchDataViewTitle = async () => {
      if (defineRuleData?.dataViewId != null && defineRuleData?.dataViewId !== '') {
        const dataView = await data.dataViews.get(defineRuleData?.dataViewId);
        setDataViewTitle(dataView.title);
      }
    };
    fetchDataViewTitle();
  }, [data.dataViews, defineRuleData?.dataViewId]);

  const { isSavedQueryLoading, savedQueryBar } = useGetSavedQuery({
    savedQueryId: rule?.saved_id,
    ruleType: rule?.type,
  });

  const hasNotificationActions = Boolean(ruleActionsData?.actions?.length);
  const hasResponseActions = Boolean(ruleActionsData?.responseActions?.length);
  const hasActions = ruleActionsData != null && (hasNotificationActions || hasResponseActions);

  return ruleLoading ? (
    <FlyoutLoading data-test-subj={RULE_PREVIEW_LOADING_TEST_ID} />
  ) : rule ? (
    <EuiPanel hasShadow={false} data-test-subj={RULE_PREVIEW_BODY_TEST_ID} className="eui-yScroll">
      <RulePreviewTitle rule={rule} isSuppressed={!isExistingRule} />
      <EuiHorizontalRule margin="s" />
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
      {defineRuleData && !isSavedQueryLoading && (
        <>
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
            <StepDefineRuleReadOnly
              addPadding={false}
              descriptionColumns="single"
              defaultValues={{
                ...defineRuleData,
                dataViewTitle,
                queryBar: savedQueryBar ?? defineRuleData.queryBar,
              }}
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
            title={
              <FormattedMessage
                id="xpack.securitySolution.flyout.preview.rule.scheduleLabel"
                defaultMessage="Schedule"
              />
            }
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
