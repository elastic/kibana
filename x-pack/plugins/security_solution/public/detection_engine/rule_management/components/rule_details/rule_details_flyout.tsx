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

import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas';
import { RuleAboutSection } from './rule_about_section';
import { RuleDefinitionSection } from './rule_definition_section';
import { RuleScheduleSection } from './rule_schedule_section';
import { RuleSetupGuideSection } from './rule_setup_guide_section';
import { RuleInvestigationGuideTab } from './rule_investigation_guide_tab';

import * as i18n from './translations';

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

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
}

const ExpandableSection = ({ title, children }: ExpandableSectionProps) => {
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
      initialIsOpen={true}
    >
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="none" direction="column">
        {children}
      </EuiFlexGroup>
    </EuiAccordion>
  );
};

interface RuleDetailsFlyoutProps {
  rule: RuleResponse;
  actionButtonLabel: string;
  isActionButtonDisabled: boolean;
  onActionButtonClick: (ruleId: string) => void;
  closeFlyout: () => void;
}

export const RuleDetailsFlyout = ({
  rule,
  actionButtonLabel,
  isActionButtonDisabled,
  onActionButtonClick,
  closeFlyout,
}: RuleDetailsFlyoutProps) => {
  const overviewTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'overview',
      name: i18n.OVERVIEW_TAB_LABEL,
      content: (
        <>
          <EuiSpacer size="m" />
          <ExpandableSection title={i18n.ABOUT_SECTION_LABEL}>
            <RuleAboutSection rule={rule} />
          </ExpandableSection>
          <EuiHorizontalRule margin="l" />
          <ExpandableSection title={i18n.DEFINITION_SECTION_LABEL}>
            <RuleDefinitionSection rule={rule} />
          </ExpandableSection>
          <EuiHorizontalRule margin="l" />
          <ExpandableSection title={i18n.SCHEDULE_SECTION_LABEL}>
            <RuleScheduleSection rule={rule} />
          </ExpandableSection>
          <EuiHorizontalRule margin="l" />
          {rule.setup && (
            <>
              <ExpandableSection title={i18n.SETUP_GUIDE_SECTION_LABEL}>
                <RuleSetupGuideSection setup={rule.setup} />
              </ExpandableSection>
              <EuiHorizontalRule margin="l" />
            </>
          )}
        </>
      ),
    }),
    [rule]
  );

  const investigationGuideTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'investigationGuide',
      name: i18n.INVESTIGATION_GUIDE_TAB_LABEL,
      content: <RuleInvestigationGuideTab note={rule.note ?? ''} />,
    }),
    [rule.note]
  );

  const tabs = useMemo(() => {
    if (rule.note) {
      return [overviewTab, investigationGuideTab];
    } else {
      return [overviewTab];
    }
  }, [overviewTab, investigationGuideTab, rule.note]);

  return (
    <EuiFlyout size="m" onClose={closeFlyout} ownFocus={false} key="prebuilt-rules-flyout">
      <EuiFlyoutHeader>
        <EuiTitle size="m" data-test-subj="rulesBulkEditFormTitle">
          <h2>{rule.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <StyledEuiFlyoutBody>
        <StyledFlexGroup direction="column" gutterSize="none">
          <StyledEuiFlexItem grow={true}>
            <EuiSpacer size="s" />
            <StyledEuiTabbedContent tabs={tabs} />
          </StyledEuiFlexItem>
        </StyledFlexGroup>
      </StyledEuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} flush="left">
              {i18n.DISMISS_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              disabled={isActionButtonDisabled}
              onClick={() => {
                onActionButtonClick(rule.rule_id);
                closeFlyout();
              }}
              fill
            >
              {actionButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
