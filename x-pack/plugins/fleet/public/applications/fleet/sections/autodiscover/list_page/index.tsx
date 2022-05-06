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
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import type { CriteriaWithPagination } from '@elastic/eui/src/components/basic_table/basic_table';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';

import type { HintStatus } from '../../../../../../common';

import type { Hint } from '../../../types';
import {
  useGetHints,
  usePagination,
  useSorting,
  useConfig,
  useUrlParams,
  useBreadcrumbs,
} from '../../../hooks';

import { HintDetailsFlyout } from './components';

export const AgentPolicyListPage: React.FunctionComponent<{}> = () => {
  useBreadcrumbs('autodiscover');
  const [detailsFlyoutOpen, setIsDetailsFlyoutOpen] = useState<boolean>(false);
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
    field: 'last_updated',
    direction: 'desc',
  });

  // Fetch agent policies
  const {
    isLoading,
    data: hintsData,
    resendRequest,
  } = useGetHints({
    page: pagination.currentPage,
    perPage: pagination.pageSize,
    sortField: sorting?.field,
    sortOrder: sorting?.direction,
    kuery: search,
  });

  const ViewRawHintButton: React.FunctionComponent<{ hint: Hint }> = ({ hint }) => {
    return (
      <EuiToolTip
        content={i18n.translate('xpack.fleet.enrollmentTokensList.revokeTokenButtonLabel', {
          defaultMessage: 'View raw hint',
        })}
      >
        <EuiButtonIcon
          aria-label={i18n.translate('xpack.fleet.enrollmentTokensList.revokeTokenButtonLabel', {
            defaultMessage: 'View raw hint',
          })}
          onClick={() => setIsDetailsFlyoutOpen(true)}
          iconType="inspect"
        />
      </EuiToolTip>
    );
  };

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
        field: 'kubernetes',
        sortable: true,
        name: i18n.translate('xpack.fleet.agentPolicyList.nameColumnTitle', {
          defaultMessage: 'Container Name',
        }),
        render: (kubernetes: Hint['kubernetes']) => <>{kubernetes.container.name || '-'}</>,
      },
      {
        field: 'kubernetes',
        sortable: true,
        name: i18n.translate('xpack.fleet.agentPolicyList.nameColumnTitle', {
          defaultMessage: 'Container Image',
        }),
        render: (kubernetes: Hint['kubernetes']) => <>{kubernetes.container.image || '-'}</>,
      },
      {
        field: 'kubernetes',
        name: i18n.translate('xpack.fleet.agentPolicyList.nameColumnTitle', {
          defaultMessage: 'Pod Name',
        }),
        render: (kubernetes: Hint['kubernetes']) => <>{kubernetes.pod.name || '-'}</>,
      },
      {
        field: 'received_at',
        sortable: true,
        name: i18n.translate('xpack.fleet.agentPolicyList.updatedOnColumnTitle', {
          defaultMessage: 'Received',
        }),
        render: (date: number) => <FormattedRelative value={date} />,
      },
      {
        field: 'status',
        sortable: true,
        name: i18n.translate('xpack.fleet.agentPolicyList.nameColumnTitle', {
          defaultMessage: 'Status',
        }),
        render: (status: string) => <>{status || 'processing'}</>,
      },
      {
        field: 'result',
        sortable: true,
        name: i18n.translate('xpack.fleet.agentPolicyList.nameColumnTitle', {
          defaultMessage: 'Status',
        }),
        render: (result: Hint['result']) => (
          <>
            {result?.package
              ? `Added package ${result.package.name} v${result.package.version}`
              : '-'}
          </>
        ),
      },
      {
        field: '',
        name: i18n.translate('xpack.fleet.agentPolicyList.nameColumnTitle', {
          defaultMessage: 'Actions',
        }),
        render: (hint: Hint) => <ViewRawHintButton hint={hint} />,
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
            defaultMessage="No autodiscover hints received"
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
        <EuiFlexItem grow={4} />
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
          ) : !search.trim() && (hintsData?.total ?? 0) === 0 ? (
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
        items={hintsData && hintsData.hints ? hintsData.hints : []}
        itemId="id"
        columns={columns}
        isSelectable={false}
        pagination={{
          pageIndex: pagination.currentPage - 1,
          pageSize: pagination.pageSize,
          totalItemCount: hintsData ? hintsData.total : 0,
          pageSizeOptions,
        }}
        sorting={{ sort: sorting }}
        onChange={onTableChange}
      />
    </>
  );
};
