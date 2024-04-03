/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiFilterGroup,
  EuiSpacer,
  EuiLink,
  EuiFieldSearch,
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
import { KqlSearchBar } from './kql_search_bar';

interface RulesListFiltersBarProps {
  actionTypes: ActionType[];
  filterOptions: TypeFilterProps['options'];
  filters: RulesListFilters;
  inputText: string;
  lastUpdate: string;
  rulesLastRunOutcomesTotal: Record<string, number>;
  rulesStatusesTotal: Record<string, number>;
  showActionFilter: boolean;
  showErrors: boolean;
  canLoadRules: boolean;
  refresh?: Date;
  onClearSelection: () => void;
  onRefreshRules: () => void;
  onToggleRuleErrors: () => void;
  setInputText: (text: string) => void;
  updateFilters: (updateFiltersProps: UpdateFiltersProps) => void;
}

const ENTER_KEY = 13;
export const RulesListFiltersBar = React.memo((props: RulesListFiltersBarProps) => {
  const {
    actionTypes,
    filterOptions,
    filters,
    inputText,
    lastUpdate,
    onClearSelection,
    onRefreshRules,
    onToggleRuleErrors,
    rulesLastRunOutcomesTotal,
    rulesStatusesTotal,
    setInputText,
    showActionFilter = true,
    showErrors,
    canLoadRules,
    refresh,
    updateFilters,
  } = props;

  const isRuleTagFilterEnabled = getIsExperimentalFeatureEnabled('ruleTagFilter');
  const isRuleStatusFilterEnabled = getIsExperimentalFeatureEnabled('ruleStatusFilter');
  const isRuleUsingExecutionStatus = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');

  const getRuleTagFilter = () => {
    if (isRuleTagFilterEnabled) {
      return [
        <RuleTagFilter
          isGrouped
          refresh={refresh}
          canLoadRules={canLoadRules}
          selectedTags={filters.tags || []}
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
          selectedStatuses={filters.ruleStatuses || []}
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
          selectedStatuses={filters.ruleExecutionStatuses || []}
          onChange={(value) => updateFilters({ filter: 'ruleExecutionStatuses', value })}
        />,
      ];
    }
    return [
      <RuleLastRunOutcomeFilter
        key="rule-last-run-outcome-filter"
        selectedOutcomes={filters.ruleLastRunOutcomes || []}
        onChange={(value) => updateFilters({ filter: 'ruleLastRunOutcomes', value })}
      />,
    ];
  };

  const toolsRight = [
    <TypeFilter
      key="type-filter"
      options={filterOptions}
      filters={filters.types || []}
      onChange={(value) => updateFilters({ filter: 'types', value })}
    />,
    showActionFilter && (
      <ActionTypeFilter
        key="action-type-filter"
        actionTypes={actionTypes}
        filters={filters.actionTypes || []}
        onChange={(value) => updateFilters({ filter: 'actionTypes', value })}
      />
    ),
    ...getRuleOutcomeOrStatusFilter(),
    ...getRuleTagFilter(),
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (e.target.value === '') {
      updateFilters({ filter: 'searchText', value: e.target.value });
    }
  };

  const handleKeyup = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.keyCode === ENTER_KEY) {
      updateFilters({ filter: 'searchText', value: inputText });
    }
  };

  const isRuleKqlBarActive = getIsExperimentalFeatureEnabled('ruleKqlBar');
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
      {isRuleKqlBarActive && (
        <KqlSearchBar
          onQuerySubmit={(kueryNode) => updateFilters({ filter: 'kueryNode', value: kueryNode })}
        />
      )}
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFieldSearch
            data-test-subj="ruleSearchField"
            fullWidth
            isClearable
            placeholder={i18n.translate(
              'xpack.triggersActionsUI.sections.rulesList.searchPlaceholderTitle',
              { defaultMessage: 'Search' }
            )}
            value={inputText}
            onChange={handleChange}
            onKeyUp={handleKeyup}
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
