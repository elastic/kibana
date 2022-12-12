/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiFilterGroup,
  EuiFieldSearch,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';
import { ActionType, RulesListFilters, UpdateFiltersProps } from '../../../../types';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { RulesListStatuses } from './rules_list_statuses';
import { RulesListAutoRefresh } from './rules_list_auto_refresh';
import { RuleExecutionStatusFilter } from './rule_execution_status_filter';
import { RuleLastRunOutcomeFilter } from './rule_last_run_outcome_filter';
import { RulesListErrorBanner } from './rules_list_error_banner';
import { TypeFilter, TypeFilterProps } from './type_filter';
import { ActionTypeFilter } from './action_type_filter';
import { RuleTagFilter } from './rule_tag_filter';
import { RuleStatusFilter } from './rule_status_filter';
import { CreateRuleButton } from './create_rule_button';

const ENTER_KEY = 13;

interface RulesListFiltersBarProps {
  inputText: string;
  filters: RulesListFilters;
  showActionFilter: boolean;
  rulesStatusesTotal: Record<string, number>;
  rulesLastRunOutcomesTotal: Record<string, number>;
  tags: string[];
  filterOptions: TypeFilterProps['options'];
  actionTypes: ActionType[];
  authorizedToCreateAnyRules: boolean;
  showCreateRuleButton: boolean;
  lastUpdate: string;
  showErrors: boolean;
  openFlyout: () => void;
  updateFilters: (updateFiltersProps: UpdateFiltersProps) => void;
  setInputText: (text: string) => void;
  onClearSelection: () => void;
  onRefreshRules: () => void;
  onToggleRuleErrors: () => void;
}

export const RulesListFiltersBar = React.memo((props: RulesListFiltersBarProps) => {
  const {
    filters,
    inputText,
    showActionFilter = true,
    rulesStatusesTotal,
    rulesLastRunOutcomesTotal,
    tags,
    actionTypes,
    filterOptions,
    authorizedToCreateAnyRules,
    showCreateRuleButton,
    lastUpdate,
    showErrors,
    openFlyout,
    updateFilters,
    setInputText,
    onClearSelection,
    onRefreshRules,
    onToggleRuleErrors,
  } = props;

  const isRuleTagFilterEnabled = getIsExperimentalFeatureEnabled('ruleTagFilter');
  const isRuleStatusFilterEnabled = getIsExperimentalFeatureEnabled('ruleStatusFilter');
  const isRuleUsingExecutionStatus = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');

  const getRuleTagFilter = () => {
    if (isRuleTagFilterEnabled) {
      return [
        <RuleTagFilter
          isGrouped
          tags={tags}
          selectedTags={filters.tags}
          onChange={(value) => updateFilters({ filter: 'tags', value })}
        />,
      ];
    }
    return [];
  };

  const renderRuleStatusFilter = () => {
    if (isRuleStatusFilterEnabled) {
      return (
        <RuleStatusFilter
          selectedStatuses={filters.ruleStatuses}
          onChange={(value) => updateFilters({ filter: 'ruleStatuses', value })}
        />
      );
    }
    return null;
  };

  const getRuleOutcomeOrStatusFilter = () => {
    if (isRuleUsingExecutionStatus) {
      return [
        <RuleExecutionStatusFilter
          key="rule-status-filter"
          selectedStatuses={filters.ruleExecutionStatuses}
          onChange={(value) => updateFilters({ filter: 'ruleExecutionStatuses', value })}
        />,
      ];
    }
    return [
      <RuleLastRunOutcomeFilter
        key="rule-last-run-outcome-filter"
        selectedOutcomes={filters.ruleLastRunOutcomes}
        onChange={(value) => updateFilters({ filter: 'ruleLastRunOutcomes', value })}
      />,
    ];
  };

  const toolsRight = [
    <TypeFilter
      key="type-filter"
      options={filterOptions}
      filters={filters.types}
      onChange={(value) => updateFilters({ filter: 'types', value })}
    />,
    showActionFilter && (
      <ActionTypeFilter
        key="action-type-filter"
        actionTypes={actionTypes}
        filters={filters.actionTypes}
        onChange={(value) => updateFilters({ filter: 'actionTypes', value })}
      />
    ),
    ...getRuleOutcomeOrStatusFilter(),
    ...getRuleTagFilter(),
  ];

  return (
    <>
      <RulesListErrorBanner
        rulesLastRunOutcomes={rulesLastRunOutcomesTotal}
        setRuleExecutionStatusesFilter={(value) =>
          updateFilters({ filter: 'ruleExecutionStatuses', value })
        }
        setRuleLastRunOutcomesFilter={(value) =>
          updateFilters({ filter: 'ruleLastRunOutcomes', value })
        }
      />
      <EuiFlexGroup gutterSize="s">
        {authorizedToCreateAnyRules && showCreateRuleButton ? (
          <EuiFlexItem grow={false}>
            <CreateRuleButton openFlyout={openFlyout} />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <EuiFieldSearch
            fullWidth
            isClearable
            data-test-subj="ruleSearchField"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (e.target.value === '') {
                updateFilters({ filter: 'searchText', value: e.target.value });
              }
            }}
            onKeyUp={(e) => {
              if (e.keyCode === ENTER_KEY) {
                updateFilters({ filter: 'searchText', value: inputText });
              }
            }}
            placeholder={i18n.translate(
              'xpack.triggersActionsUI.sections.rulesList.searchPlaceholderTitle',
              { defaultMessage: 'Search' }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{renderRuleStatusFilter()}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            {toolsRight.map((tool, index: number) => (
              <React.Fragment key={index}>{tool}</React.Fragment>
            ))}
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="refreshRulesButton"
            iconType="refresh"
            onClick={() => {
              onClearSelection();
              onRefreshRules();
            }}
            name="refresh"
            color="primary"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.rulesList.refreshRulesButtonLabel"
              defaultMessage="Refresh"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="none">
            <RulesListStatuses
              rulesStatuses={rulesStatusesTotal}
              rulesLastRunOutcomes={rulesLastRunOutcomesTotal}
            />
            <RulesListAutoRefresh lastUpdate={lastUpdate} onRefresh={onRefreshRules} />
          </EuiFlexGroup>
        </EuiFlexItem>
        {rulesStatusesTotal.error > 0 && (
          <EuiFlexItem grow={false}>
            <EuiLink data-test-subj="expandRulesError" color="primary" onClick={onToggleRuleErrors}>
              {!showErrors && (
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.showAllErrors"
                  defaultMessage="Show {totalStatusesError, plural, one {error} other {errors}}"
                  values={{
                    totalStatusesError: rulesStatusesTotal.error,
                  }}
                />
              )}
              {showErrors && (
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.hideAllErrors"
                  defaultMessage="Hide {totalStatusesError, plural, one {error} other {errors}}"
                  values={{
                    totalStatusesError: rulesStatusesTotal.error,
                  }}
                />
              )}
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
});
