/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { EuiTableActionsColumnType, EuiTableFieldDataColumnType } from '@elastic/eui';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiEmptyPrompt,
  EuiBasicTable,
  EuiLink,
  EuiTextColor,
} from '@elastic/eui';
import type { CriteriaWithPagination } from '@elastic/eui/src/components/basic_table/basic_table';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedDate } from '@kbn/i18n-react';

import type { Hint } from '../../../types';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../../constants';
import {
  useGetAgentPolicies,
  usePagination,
  useSorting,
  useConfig,
  useUrlParams,
  useBreadcrumbs,
} from '../../../hooks';
import { AgentPolicySummaryLine, SearchBar } from '../../../components';

import { HintDetailsFlyout } from './components';

export const AgentPolicyListPage: React.FunctionComponent<{}> = () => {
  useBreadcrumbs('autodiscover');

  const {
    agents: { enabled: isFleetEnabled },
  } = useConfig();

  // Table and search states
  const { urlParams } = useUrlParams();
  const [search, setSearch] = useState<string>(
    Array.isArray(urlParams.kuery)
      ? urlParams.kuery[urlParams.kuery.length - 1]
      : urlParams.kuery ?? ''
  );
  const { pagination, pageSizeOptions, setPagination } = usePagination();
  const { sorting, setSorting } = useSorting<Hint>({
    field: 'last_update',
    direction: 'desc',
  });

  // Fetch agent policies
  const {
    isLoading,
    data: agentPolicyData,
    resendRequest,
  } = useGetAgentPolicies({
    page: pagination.currentPage,
    perPage: pagination.pageSize,
    sortField: sorting?.field,
    sortOrder: sorting?.direction,
    kuery: search,
  });

  // Some policies retrieved, set up table props
  const columns = useMemo(() => {
    const cols: Array<EuiTableFieldDataColumnType<Hint> | EuiTableActionsColumnType<Hint>> = [
      {
        field: 'agent_id',
        sortable: true,
        name: i18n.translate('xpack.fleet.agentPolicyList.nameColumnTitle', {
          defaultMessage: 'Agent ID',
        }),
        render: (agentId: string) => <>{agentId}</>,
      },
      {
        field: 'received_at',
        sortable: true,
        name: i18n.translate('xpack.fleet.agentPolicyList.updatedOnColumnTitle', {
          defaultMessage: 'Received on',
        }),
        render: (date: number) => (
          <FormattedDate value={date} year="numeric" month="short" day="2-digit" />
        ),
      },
      {
        field: 'status',
        sortable: true,
        name: i18n.translate('xpack.fleet.agentPolicyList.nameColumnTitle', {
          defaultMessage: 'Status',
        }),
        render: (status: string) => <>{status || 'procssing'}</>,
      },
    ];

    // If Fleet is not enabled, then remove the `agents` column
    if (!isFleetEnabled) {
      return cols.filter((col) => ('field' in col ? col.field !== 'agents' : true));
    }

    return cols;
  }, [isFleetEnabled]);

  const emptyPrompt = (
    <EuiEmptyPrompt
      title={
        <h2>
          <FormattedMessage
            id="xpack.fleet.agentPolicyList.noAgentPoliciesPrompt"
            defaultMessage="No autodiscover hints"
          />
        </h2>
      }
    />
  );
  const onTableChange = (criteria: CriteriaWithPagination<Hint>) => {
    const newPagination = {
      ...pagination,
      currentPage: criteria.page.index + 1,
      pageSize: criteria.page.size,
    };
    setPagination(newPagination);
    setSorting(criteria.sort);
  };

  return (
    <>
      <EuiFlexGroup alignItems={'center'} gutterSize="m">
        <EuiFlexItem grow={4}>
          <SearchBar
            value={search}
            onChange={(newSearch) => {
              setPagination({
                ...pagination,
                currentPage: 1,
              });
              setSearch(newSearch);
            }}
            fieldPrefix={AGENT_POLICY_SAVED_OBJECT_TYPE}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton color="primary" iconType="refresh" onClick={() => resendRequest()}>
            <FormattedMessage
              id="xpack.fleet.agentPolicyList.reloadAgentPoliciesButtonText"
              defaultMessage="Reload"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiBasicTable<Hint>
        loading={isLoading}
        hasActions={true}
        noItemsMessage={
          isLoading ? (
            <FormattedMessage
              id="xpack.fleet.agentPolicyList.loadingAgentPoliciesMessage"
              defaultMessage="Loading agent policies…"
            />
          ) : !search.trim() && (agentPolicyData?.total ?? 0) === 0 ? (
            emptyPrompt
          ) : (
            <FormattedMessage
              id="xpack.fleet.agentPolicyList.noFilteredAgentPoliciesPrompt"
              defaultMessage="No agent policies found. {clearFiltersLink}"
              values={{
                clearFiltersLink: (
                  <EuiLink onClick={() => setSearch('')}>
                    <FormattedMessage
                      id="xpack.fleet.agentPolicyList.clearFiltersLinkText"
                      defaultMessage="Clear filters"
                    />
                  </EuiLink>
                ),
              }}
            />
          )
        }
        items={agentPolicyData ? agentPolicyData.items : []}
        itemId="id"
        columns={columns}
        isSelectable={false}
        pagination={{
          pageIndex: pagination.currentPage - 1,
          pageSize: pagination.pageSize,
          totalItemCount: agentPolicyData ? agentPolicyData.total : 0,
          pageSizeOptions,
        }}
        sorting={{ sort: sorting }}
        onChange={onTableChange}
      />
    </>
  );
};
