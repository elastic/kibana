/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiTitle,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTabbedContent,
  EuiAccordion,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { parseDuration } from '@kbn/alerting-plugin/common/parse_duration';

import { useAddPrebuiltRulesTableContext } from '../../../rule_management_ui/components/rules_table/add_prebuilt_rules_table/add_prebuilt_rules_table_context';
import { useRuleDetailsFlyoutContext } from '../../../rule_management_ui/components/rules_table/add_prebuilt_rules_table/use_rule_details_flyout';
import { useUpgradePrebuiltRulesTableContext } from '../../../rule_management_ui/components/rules_table/upgrade_prebuilt_rules_table/upgrade_prebuilt_rules_table_context';
import { fillEmptySeverityMappings } from '../../../../detections/pages/detection_engine/rules/helpers';
import { RuleAboutSection } from './rule_about_section';
import type { RuleAboutSectionProps } from './rule_about_section';
import { RuleDefinitionSection } from './rule_definition_section';
import type { RuleDefinitionSectionProps } from './rule_definition_section';
import { RuleScheduleSection } from './rule_schedule_section';
import type { RuleScheduleSectionProps } from './rule_schedule_section';
import { RuleSetupGuideSection } from './rule_setup_guide_section';
import { RuleInvestigationGuideTab } from './rule_investigation_guide_tab';
import type {
  AboutStepSeverity,
  AboutStepRiskScore,
} from '../../../../detections/pages/detection_engine/rules/types';
import type { InvestigationGuide } from '../../../../../common/api/detection_engine/model/rule_schema/common_attributes/misc_attributes';

const formatLookback = (lookback: string): string => {
  const lookbackSeconds = Math.floor(parseDuration(lookback) / 1000);

  if (lookbackSeconds === 0) {
    return `0s`;
  }

  if (lookbackSeconds % 3600 === 0) {
    return `${lookbackSeconds / 3600}h`;
  } else if (lookbackSeconds % 60 === 0) {
    return `${lookbackSeconds / 60}m`;
  } else {
    return `${lookbackSeconds}s`;
  }
};

export const AddPrebuiltRuleFlyout = () => {
  const {
    state: { loadingRules, isRefetching, isUpgradingSecurityPackages },
    actions: { installOneRule },
  } = useAddPrebuiltRulesTableContext();

  return (
    <RuleDetailsFlyoutWrapper
      installOneRule={installOneRule}
      loadingRules={loadingRules}
      isRefetching={isRefetching}
      isUpgradingSecurityPackages={isUpgradingSecurityPackages}
    />
  );
};

export const UpgradePrebuiltRuleFlyout = () => {
  const {
    state: { loadingRules, isRefetching, isUpgradingSecurityPackages },
    actions: { upgradeOneRule },
  } = useUpgradePrebuiltRulesTableContext();

  return (
    <RuleDetailsFlyoutWrapper
      upgradeOneRule={upgradeOneRule}
      loadingRules={loadingRules}
      isRefetching={isRefetching}
      isUpgradingSecurityPackages={isUpgradingSecurityPackages}
    />
  );
};

interface RuleDetailsFlyoutWrapperProps {
  loadingRules: string[];
  isRefetching: boolean;
  isUpgradingSecurityPackages: boolean;
  installOneRule?: (ruleId: string) => void;
  upgradeOneRule?: (ruleId: string) => void;
}

export const RuleDetailsFlyoutWrapper = ({
  loadingRules,
  isRefetching,
  isUpgradingSecurityPackages,
  installOneRule,
  upgradeOneRule,
}: RuleDetailsFlyoutWrapperProps) => {
  const {
    state: { flyoutRule },
    actions: { closeFlyout },
  } = useRuleDetailsFlyoutContext();

  if (flyoutRule == null) {
    return null;
  }

  const isActionButtonDisabled =
    loadingRules.includes(flyoutRule.rule_id) || isRefetching || isUpgradingSecurityPackages;

  const severity: AboutStepSeverity = {
    value: flyoutRule.severity,
    mapping: fillEmptySeverityMappings(flyoutRule.severity_mapping),
    isMappingChecked: flyoutRule.severity_mapping.length > 0,
  };

  const riskScore: AboutStepRiskScore = {
    value: flyoutRule.risk_score,
    mapping: flyoutRule.risk_score_mapping,
    isMappingChecked: flyoutRule.risk_score_mapping.length > 0,
  };

  const lookback = formatLookback(flyoutRule.rule_schedule.lookback);

  const ruleNameOverride = flyoutRule.rule_name_override?.field_name ?? '';

  return (
    <RuleDetailsFlyout
      ruleId={flyoutRule.rule_id}
      name={flyoutRule.name}
      description={flyoutRule.description}
      author={flyoutRule.author}
      severity={severity}
      riskScore={riskScore}
      license={flyoutRule.license}
      ruleNameOverride={ruleNameOverride}
      threat={flyoutRule.threat}
      requiredFields={flyoutRule.required_fields}
      relatedIntegrations={flyoutRule.related_integrations}
      interval={flyoutRule.rule_schedule.interval}
      lookback={lookback}
      setup={flyoutRule.setup}
      note={flyoutRule.note}
      isActionButtonDisabled={isActionButtonDisabled}
      closeFlyout={closeFlyout}
      installOneRule={installOneRule}
      upgradeOneRule={upgradeOneRule}
    />
  );
};

const ExpandableSection = ({ title, children }) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'accordion' });

  return (
    <EuiAccordion
      paddingSize="l"
      id={accordionId}
      buttonContent={
        <EuiTitle size="m">
          <h3>{title}</h3>
        </EuiTitle>
      }
    >
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="none" direction="column">
        {children}
      </EuiFlexGroup>
    </EuiAccordion>
  );
};

const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflow {
    display: flex;
    flex: 1;
    overflow: hidden;

    .euiFlyoutBody__overflowContent {
      flex: 1;
      overflow: hidden;
      padding: ${({ theme }) => `0 ${theme.eui.euiSizeM} ${theme.eui.euiSizeM}`};
    }
  }
`;

const StyledFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

const StyledEuiFlexItem = styled(EuiFlexItem)`
  &.euiFlexItem {
    flex: 1 0 0;
    overflow: hidden;
  }
`;

const StyledEuiTabbedContent = styled(EuiTabbedContent)`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;

  > [role='tabpanel'] {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
    overflow-y: auto;

    ::-webkit-scrollbar {
      -webkit-appearance: none;
      width: 7px;
    }

    ::-webkit-scrollbar-thumb {
      border-radius: 4px;
      background-color: rgba(0, 0, 0, 0.5);
      -webkit-box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
    }
  }
`;

type RuleDetailsFlyoutProps = {
  ruleId: string;
  name: string;
  setup: string;
  note: InvestigationGuide;
  isActionButtonDisabled: boolean;
  closeFlyout: () => void;
  installOneRule?: (ruleId: string) => void;
  upgradeOneRule?: (ruleId: string) => void;
} & RuleAboutSectionProps &
  RuleDefinitionSectionProps &
  RuleScheduleSectionProps;

export const RuleDetailsFlyout = ({
  ruleId,
  name,
  description,
  author,
  severity,
  riskScore,
  ruleNameOverride,
  license,
  threat,
  requiredFields,
  relatedIntegrations,
  interval,
  lookback,
  setup,
  note,
  isActionButtonDisabled,
  closeFlyout,
  installOneRule,
  upgradeOneRule,
}: RuleDetailsFlyoutProps) => {
  const overviewTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'overview',
      name: 'Overview',
      content: (
        <>
          <EuiSpacer size="m" />
          <ExpandableSection title="About">
            <RuleAboutSection
              description={description}
              author={author}
              severity={severity}
              riskScore={riskScore}
              ruleNameOverride={ruleNameOverride}
              license={license}
              threat={threat}
            />
          </ExpandableSection>
          <EuiHorizontalRule margin="l" />
          <ExpandableSection title="Definition">
            <RuleDefinitionSection
              requiredFields={requiredFields}
              relatedIntegrations={relatedIntegrations}
            />
          </ExpandableSection>
          <EuiHorizontalRule margin="l" />
          <ExpandableSection title="Schedule">
            <RuleScheduleSection interval={interval} lookback={lookback} />
          </ExpandableSection>
          <EuiHorizontalRule margin="l" />
          <ExpandableSection title="Setup guide">
            <RuleSetupGuideSection setup={setup} />
          </ExpandableSection>
          <EuiHorizontalRule margin="l" />
        </>
      ),
    }),
    [
      description,
      author,
      severity,
      riskScore,
      ruleNameOverride,
      license,
      threat,
      requiredFields,
      relatedIntegrations,
      interval,
      lookback,
      setup,
    ]
  );

  const investigationGuideTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'investigationGuide',
      name: 'Investigation guide',
      content: <RuleInvestigationGuideTab note={note} />,
    }),
    [note]
  );

  const isInstallFlyout = typeof installOneRule !== 'undefined';

  return (
    <EuiFlyout size="m" onClose={closeFlyout} ownFocus={false} key="prebuilt-rules-flyout">
      <EuiFlyoutHeader>
        <EuiTitle size="m" data-test-subj="rulesBulkEditFormTitle">
          <h2>{name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <StyledEuiFlyoutBody>
        <StyledFlexGroup direction="column" gutterSize="none">
          <StyledEuiFlexItem grow={true}>
            <EuiSpacer size="s" />
            <StyledEuiTabbedContent tabs={[overviewTab, investigationGuideTab]} />
          </StyledEuiFlexItem>
        </StyledFlexGroup>
      </StyledEuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} flush="left">
              {'Dismiss'}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              disabled={isActionButtonDisabled}
              onClick={() => {
                if (isInstallFlyout) {
                  installOneRule(ruleId);
                } else {
                  upgradeOneRule(ruleId);
                }

                closeFlyout();
              }}
              fill
            >
              {isInstallFlyout ? 'Install' : 'Update'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
