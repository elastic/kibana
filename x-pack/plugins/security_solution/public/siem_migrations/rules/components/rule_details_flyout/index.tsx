/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useMemo, useState, useEffect } from 'react';
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
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiTabbedContentTab, EuiTabbedContentProps, EuiFlyoutProps } from '@elastic/eui';

import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import {
  RuleOverviewTab,
  useOverviewTabSections,
} from '../../../../detection_engine/rule_management/components/rule_details/rule_overview_tab';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';

import * as i18n from './translations';
import {
  DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS,
  LARGE_DESCRIPTION_LIST_COLUMN_WIDTHS,
} from './constants';
import { TranslationTab } from './translation_tab';
import {
  convertMigrationCustomRuleToSecurityRulePayload,
  isMigrationCustomRule,
} from '../../../../../common/siem_migrations/rules/utils';

/*
 * Fixes tabs to the top and allows the content to scroll.
 */
const ScrollableFlyoutTabbedContent = (props: EuiTabbedContentProps) => (
  <EuiFlexGroup direction="column" gutterSize="none">
    <EuiFlexItem grow={true}>
      <EuiTabbedContent {...props} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const tabPaddingClassName = css`
  padding: 0 ${euiThemeVars.euiSizeM} ${euiThemeVars.euiSizeXL} ${euiThemeVars.euiSizeM};
`;

export const TabContentPadding: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <div className={tabPaddingClassName}>{children}</div>
);

interface MigrationRuleDetailsFlyoutProps {
  ruleActions?: React.ReactNode;
  ruleMigration: RuleMigration;
  matchedPrebuiltRule?: RuleResponse;
  size?: EuiFlyoutProps['size'];
  extraTabs?: EuiTabbedContentTab[];
  closeFlyout: () => void;
}

export const MigrationRuleDetailsFlyout: React.FC<MigrationRuleDetailsFlyoutProps> = React.memo(
  ({
    ruleActions,
    ruleMigration,
    matchedPrebuiltRule,
    size = 'm',
    extraTabs = [],
    closeFlyout,
  }: MigrationRuleDetailsFlyoutProps) => {
    const { expandedOverviewSections, toggleOverviewSection } = useOverviewTabSections();

    const rule = useMemo(() => {
      if (isMigrationCustomRule(ruleMigration.elastic_rule)) {
        return convertMigrationCustomRuleToSecurityRulePayload(
          ruleMigration.elastic_rule
        ) as RuleResponse; // TODO: we need to adjust RuleOverviewTab to allow partial RuleResponse as a parameter;
      }
      return matchedPrebuiltRule;
    }, [matchedPrebuiltRule, ruleMigration]);

    const translationTab: EuiTabbedContentTab = useMemo(
      () => ({
        id: 'translation',
        name: i18n.TRANSLATION_TAB_LABEL,
        content: (
          <TabContentPadding>
            <TranslationTab
              ruleMigration={ruleMigration}
              matchedPrebuiltRule={matchedPrebuiltRule}
            />
          </TabContentPadding>
        ),
      }),
      [matchedPrebuiltRule, ruleMigration]
    );

    const overviewTab: EuiTabbedContentTab = useMemo(
      () => ({
        id: 'overview',
        name: i18n.OVERVIEW_TAB_LABEL,
        content: (
          <TabContentPadding>
            {rule && (
              <RuleOverviewTab
                rule={rule}
                columnWidths={
                  size === 'l'
                    ? LARGE_DESCRIPTION_LIST_COLUMN_WIDTHS
                    : DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS
                }
                expandedOverviewSections={expandedOverviewSections}
                toggleOverviewSection={toggleOverviewSection}
              />
            )}
          </TabContentPadding>
        ),
      }),
      [rule, size, expandedOverviewSections, toggleOverviewSection]
    );

    const tabs = useMemo(() => {
      return [...extraTabs, translationTab, overviewTab];
    }, [extraTabs, translationTab, overviewTab]);

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

    const migrationsRulesFlyoutTitleId = useGeneratedHtmlId({
      prefix: 'migrationRulesFlyoutTitle',
    });

    return (
      <EuiFlyout
        size={size}
        onClose={closeFlyout}
        key="migrations-rules-flyout"
        paddingSize="l"
        data-test-subj="ruleMigrationDetailsFlyout"
        aria-labelledby={migrationsRulesFlyoutTitleId}
        ownFocus
      >
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2 id={migrationsRulesFlyoutTitleId}>
              {rule?.name ?? ruleMigration.original_rule.title}
            </h2>
          </EuiTitle>
          <EuiSpacer size="l" />
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <ScrollableFlyoutTabbedContent
            tabs={tabs}
            selectedTab={selectedTab}
            onTabClick={onTabClick}
          />
        </EuiFlyoutBody>
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
  }
);
MigrationRuleDetailsFlyout.displayName = 'MigrationRuleDetailsFlyout';
