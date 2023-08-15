/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';
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
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { EuiTabbedContentTab } from '@elastic/eui';

import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas';
import { RuleOverviewTab, useOverviewTabSections } from './rule_overview_tab';
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
      padding: ${({ theme }) => `0 ${theme.eui.euiSizeL} ${theme.eui.euiSizeM}`};
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

interface RuleDetailsFlyoutProps {
  rule: Partial<RuleResponse>;
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
  const { expandedOverviewSections, toggleOverviewSection } = useOverviewTabSections();

  const overviewTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'overview',
      name: i18n.OVERVIEW_TAB_LABEL,
      content: (
        <RuleOverviewTab
          rule={rule}
          expandedOverviewSections={expandedOverviewSections}
          toggleOverviewSection={toggleOverviewSection}
        />
      ),
    }),
    [rule, expandedOverviewSections, toggleOverviewSection]
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

  const [selectedTabId, setSelectedTabId] = useState<string>(tabs[0].id);
  const selectedTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0];

  useEffect(() => {
    if (!tabs.find((tab) => tab.id === selectedTabId)) {
      // Switch to first tab if currently selected tab is not available for this rule
      setSelectedTabId(tabs[0].id);
    }
  }, [tabs, selectedTabId]);

  const onTabClick = (tab: EuiTabbedContentTab) => {
    setSelectedTabId(tab.id);
  };

  return (
    <EuiFlyout
      size="m"
      onClose={closeFlyout}
      ownFocus={false}
      key="prebuilt-rules-flyout"
      paddingSize="l"
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m" data-test-subj="rulesBulkEditFormTitle">
          <h2>{rule.name}</h2>
        </EuiTitle>
        <EuiSpacer size="l" />
      </EuiFlyoutHeader>
      <StyledEuiFlyoutBody>
        <StyledFlexGroup direction="column" gutterSize="none">
          <StyledEuiFlexItem grow={true}>
            <StyledEuiTabbedContent tabs={tabs} selectedTab={selectedTab} onTabClick={onTabClick} />
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
                onActionButtonClick(rule.rule_id ?? '');
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
