/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useMemo, ChangeEvent } from 'react';
import { i18n } from '@kbn/i18n';
import { getRuleDetailsRoute } from '@kbn/rule-data-utils';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiTableSortingType,
  EuiLink,
  EuiText,
  EuiHealth,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
} from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import { getRuleHealthColor } from '../../../common/lib/rule_status_helpers';
import { useLoadRuleTypesQuery } from '../../hooks/use_load_rule_types_query';
import { useLoadRulesQuery } from '../../hooks/use_load_rules_query';
import { Pagination, Rule, ActionConnector } from '../../../types';
import { DEFAULT_SEARCH_PAGE_SIZE } from '../../constants';
import { rulesLastRunOutcomeTranslationMapping } from '../rules_list/translations';
import { NoPermissionPrompt } from '../../components/prompts/no_permission_prompt';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';

export interface ConnectorRulesListProps {
  connector: ActionConnector;
}

export const ConnectorRulesList = (props: ConnectorRulesListProps) => {
  const { connector } = props;

  const {
    application: { getUrlForApp },
  } = useKibana().services;

  const [searchText, setSearchText] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [page, setPage] = useState<Pagination>({ index: 0, size: DEFAULT_SEARCH_PAGE_SIZE });
  const [sort, setSort] = useState<EuiTableSortingType<Rule>['sort']>({
    field: 'name',
    direction: 'asc',
  });

  const {
    ruleTypesState,
    hasAnyAuthorizedRuleType,
    authorizedRuleTypes,
    authorizedToReadAnyRules,
    isSuccess: isLoadRuleTypesSuccess,
  } = useLoadRuleTypesQuery({ filteredRuleTypes: [] });

  const ruleTypeIds = authorizedRuleTypes.map((art) => art.id);

  const { rulesState } = useLoadRulesQuery({
    filters: {
      searchText: searchFilter,
      types: ruleTypeIds,
    },
    hasReference: {
      type: 'action',
      id: connector.id,
    },
    hasDefaultRuleTypesFiltersOn: ruleTypeIds.length === 0,
    page,
    sort,
    onPage: setPage,
    enabled: isLoadRuleTypesSuccess && hasAnyAuthorizedRuleType,
  });

  const showNoAuthPrompt = !ruleTypesState.initialLoad && !authorizedToReadAnyRules;
  const isInitialLoading = ruleTypesState.initialLoad || rulesState.initialLoad;
  const showSpinner =
    isInitialLoading && (ruleTypesState.isLoading || (!showNoAuthPrompt && rulesState.isLoading));
  const isLoading = ruleTypesState.isLoading || rulesState.isLoading;

  const columns = useMemo<Array<EuiBasicTableColumn<Rule>>>(() => {
    return [
      {
        field: 'name',
        name: i18n.translate('xpack.triggersActionsUI.sections.connectorRulesList.columns.name', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        truncateText: false,
        render: (name: string, rule: Rule) => {
          return (
            <EuiLink
              title={name}
              href={getUrlForApp('management', {
                path: `insightsAndAlerting/triggersActions/${getRuleDetailsRoute(rule.id)}`,
              })}
            >
              {name}
            </EuiLink>
          );
        },
      },
      {
        field: 'ruleTypeId',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.connectorRulesList.columns.ruleType',
          { defaultMessage: 'Rule type' }
        ),
        truncateText: false,
        render: (ruleTypeId: string) => {
          return (
            <EuiText size="s">{ruleTypesState.data.get(ruleTypeId)?.name || ruleTypeId}</EuiText>
          );
        },
      },
      {
        field: 'lastRun.outcome',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.connectorRulesList.columns.lastResponse',
          { defaultMessage: 'Last response' }
        ),
        sortable: true,
        truncateText: false,
        render: (_, rule: Rule) => {
          return (
            rule.lastRun && (
              <EuiHealth color={getRuleHealthColor(rule) || 'default'}>
                {rulesLastRunOutcomeTranslationMapping[rule.lastRun.outcome]}
              </EuiHealth>
            )
          );
        },
      },
    ];
  }, [ruleTypesState, getUrlForApp]);

  const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  const onSearch = useCallback(() => {
    setSearchFilter(searchText);
  }, [searchText]);

  if (showNoAuthPrompt) {
    return <NoPermissionPrompt />;
  }

  if (showSpinner) {
    return <CenterJustifiedSpinner />;
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFieldSearch
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.sections.connectorRulesList.fieldSearch.label',
            { defaultMessage: 'Search rules' }
          )}
          fullWidth
          incremental={false}
          onChange={onChange}
          onSearch={onSearch}
          placeholder={i18n.translate(
            'xpack.triggersActionsUI.sections.connectorRulesList.fieldSearch.placeholder',
            { defaultMessage: 'Search rules' }
          )}
          value={searchText}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiBasicTable
          loading={isLoading}
          items={rulesState.data}
          columns={columns}
          sorting={{ sort }}
          pagination={{
            pageIndex: page.index,
            pageSize: page.size,
            totalItemCount: ruleTypesState.initialLoad ? 0 : rulesState.totalItemCount,
          }}
          onChange={({
            page: changedPage,
            sort: changedSort,
          }: {
            page?: Pagination;
            sort?: EuiTableSortingType<Rule>['sort'];
          }) => {
            if (changedPage) {
              setPage(changedPage);
            }
            if (changedSort) {
              setSort(changedSort);
            }
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
