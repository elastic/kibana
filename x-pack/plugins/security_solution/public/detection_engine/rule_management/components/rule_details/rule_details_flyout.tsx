/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { css } from '@emotion/css';
import { euiThemeVars } from '@kbn/ui-theme';
import {
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
import type { EuiTabbedContentTab, EuiTabbedContentProps } from '@elastic/eui';

import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';
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
      padding: ${({ theme }) => `0 ${theme.eui.euiSizeL} 0`};
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

/*
 * Fixes tabs to the top and allows the content to scroll.
 */
const ScrollableFlyoutTabbedContent = (props: EuiTabbedContentProps) => (
  <StyledFlexGroup direction="column" gutterSize="none">
    <StyledEuiFlexItem grow={true}>
      <StyledEuiTabbedContent {...props} />
    </StyledEuiFlexItem>
  </StyledFlexGroup>
);

const tabPaddingClassName = css`
  padding: 0 ${euiThemeVars.euiSizeM} ${euiThemeVars.euiSizeXL} ${euiThemeVars.euiSizeM};
`;

const TabContentPadding: React.FC = ({ children }) => (
  <div className={tabPaddingClassName}>{children}</div>
);

interface RuleDetailsFlyoutProps {
  rule: RuleResponse;
  ruleActions?: React.ReactNode;
  dataTestSubj?: string;
  closeFlyout: () => void;
}

export const RuleDetailsFlyout = ({
  rule,
  ruleActions,
  dataTestSubj,
  closeFlyout,
}: RuleDetailsFlyoutProps) => {
  const { expandedOverviewSections, toggleOverviewSection } = useOverviewTabSections();

  const overviewTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'overview',
      name: i18n.OVERVIEW_TAB_LABEL,
      content: (
        <TabContentPadding>
          <RuleOverviewTab
            rule={rule}
            expandedOverviewSections={expandedOverviewSections}
            toggleOverviewSection={toggleOverviewSection}
          />
        </TabContentPadding>
      ),
    }),
    [rule, expandedOverviewSections, toggleOverviewSection]
  );

  const investigationGuideTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'investigationGuide',
      name: i18n.INVESTIGATION_GUIDE_TAB_LABEL,
      content: (
        <TabContentPadding>
          <RuleInvestigationGuideTab note={rule.note ?? ''} />
        </TabContentPadding>
      ),
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
      data-test-subj={dataTestSubj}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>{rule.name}</h2>
        </EuiTitle>
        <EuiSpacer size="l" />
      </EuiFlyoutHeader>
      <StyledEuiFlyoutBody>
        <ScrollableFlyoutTabbedContent
          tabs={tabs}
          selectedTab={selectedTab}
          onTabClick={onTabClick}
        />
      </StyledEuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} flush="left">
              {i18n.DISMISS_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{ruleActions}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
