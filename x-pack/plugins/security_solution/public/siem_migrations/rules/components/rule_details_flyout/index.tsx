/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
  EuiSkeletonLoading,
  EuiSkeletonTitle,
  EuiSkeletonText,
} from '@elastic/eui';
import type { EuiTabbedContentTab, EuiTabbedContentProps, EuiFlyoutProps } from '@elastic/eui';

import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import {
  RuleOverviewTab,
  useOverviewTabSections,
} from '../../../../detection_engine/rule_management/components/rule_details/rule_overview_tab';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';

import * as logicI18n from '../../logic/translations';
import * as i18n from './translations';
import {
  DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS,
  LARGE_DESCRIPTION_LIST_COLUMN_WIDTHS,
} from './constants';
import { SummaryTab, TranslationTab } from './tabs';
import {
  convertMigrationCustomRuleToSecurityRulePayload,
  isMigrationCustomRule,
} from '../../../../../common/siem_migrations/rules/utils';
import { useUpdateMigrationRules } from '../../logic/use_update_migration_rules';

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
  ruleMigration: RuleMigration;
  ruleActions?: React.ReactNode;
  matchedPrebuiltRule?: RuleResponse;
  size?: EuiFlyoutProps['size'];
  extraTabs?: EuiTabbedContentTab[];
  isDataLoading?: boolean;
  closeFlyout: () => void;
}

export const MigrationRuleDetailsFlyout: React.FC<MigrationRuleDetailsFlyoutProps> = React.memo(
  ({
    ruleActions,
    ruleMigration,
    matchedPrebuiltRule,
    size = 'm',
    extraTabs = [],
    isDataLoading,
    closeFlyout,
  }: MigrationRuleDetailsFlyoutProps) => {
    const { addError } = useAppToasts();

    const { expandedOverviewSections, toggleOverviewSection } = useOverviewTabSections();

    const { mutateAsync: updateMigrationRules } = useUpdateMigrationRules(
      ruleMigration.migration_id
    );

    const [isUpdating, setIsUpdating] = useState(false);
    const isLoading = isDataLoading || isUpdating;

    const handleTranslationUpdate = useCallback(
      async (ruleName: string, ruleQuery: string) => {
        if (!ruleMigration || isLoading) {
          return;
        }
        setIsUpdating(true);
        try {
          await updateMigrationRules([
            {
              id: ruleMigration.id,
              elastic_rule: {
                title: ruleName,
                query: ruleQuery,
              },
            },
          ]);
        } catch (error) {
          addError(error, { title: logicI18n.UPDATE_MIGRATION_RULES_FAILURE });
        } finally {
          setIsUpdating(false);
        }
      },
      [addError, ruleMigration, isLoading, updateMigrationRules]
    );

    const ruleDetailsToOverview = useMemo(() => {
      const elasticRule = ruleMigration?.elastic_rule;
      if (isMigrationCustomRule(elasticRule)) {
        return convertMigrationCustomRuleToSecurityRulePayload(elasticRule, false) as RuleResponse; // TODO: we need to adjust RuleOverviewTab to allow partial RuleResponse as a parameter;
      }
      return matchedPrebuiltRule;
    }, [ruleMigration, matchedPrebuiltRule]);

    const translationTab: EuiTabbedContentTab = useMemo(
      () => ({
        id: 'translation',
        name: i18n.TRANSLATION_TAB_LABEL,
        content: (
          <TabContentPadding>
            {ruleMigration && (
              <TranslationTab
                ruleMigration={ruleMigration}
                matchedPrebuiltRule={matchedPrebuiltRule}
                onTranslationUpdate={handleTranslationUpdate}
              />
            )}
          </TabContentPadding>
        ),
      }),
      [ruleMigration, handleTranslationUpdate, matchedPrebuiltRule]
    );

    const overviewTab: EuiTabbedContentTab = useMemo(
      () => ({
        id: 'overview',
        name: i18n.OVERVIEW_TAB_LABEL,
        content: (
          <TabContentPadding>
            {ruleDetailsToOverview && (
              <RuleOverviewTab
                rule={ruleDetailsToOverview}
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
      [ruleDetailsToOverview, size, expandedOverviewSections, toggleOverviewSection]
    );

    const summaryTab: EuiTabbedContentTab = useMemo(
      () => ({
        id: 'summary',
        name: i18n.SUMMARY_TAB_LABEL,
        content: (
          <TabContentPadding>
            <SummaryTab ruleMigration={ruleMigration} />
          </TabContentPadding>
        ),
      }),
      [ruleMigration]
    );

    const tabs = useMemo(() => {
      return [...extraTabs, translationTab, overviewTab, summaryTab];
    }, [extraTabs, translationTab, overviewTab, summaryTab]);

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

    const tabsContent = useMemo(() => {
      return (
        <ScrollableFlyoutTabbedContent
          tabs={tabs}
          selectedTab={selectedTab}
          onTabClick={onTabClick}
        />
      );
    }, [selectedTab, tabs]);

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
              {ruleDetailsToOverview?.name ??
                ruleMigration?.original_rule.title ??
                i18n.UNKNOWN_MIGRATION_RULE_TITLE}
            </h2>
          </EuiTitle>
          <EuiSpacer size="l" />
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiSkeletonLoading
            isLoading={isLoading}
            loadingContent={
              <>
                <EuiSkeletonTitle />
                <EuiSkeletonText />
              </>
            }
            loadedContent={tabsContent}
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
