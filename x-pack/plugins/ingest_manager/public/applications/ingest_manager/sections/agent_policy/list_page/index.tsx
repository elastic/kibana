/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiEmptyPrompt,
  EuiBasicTable,
  EuiLink,
  EuiTableActionsColumnType,
  EuiTableFieldDataColumnType,
  EuiTextColor,
} from '@elastic/eui';
import { CriteriaWithPagination } from '@elastic/eui/src/components/basic_table/basic_table';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedDate } from '@kbn/i18n/react';
import { useHistory } from 'react-router-dom';
import { AgentPolicy } from '../../../types';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../../constants';
import { WithHeaderLayout } from '../../../layouts';
import {
  useCapabilities,
  useGetAgentPolicies,
  usePagination,
  useSorting,
  useLink,
  useConfig,
  useUrlParams,
  useBreadcrumbs,
} from '../../../hooks';
import { SearchBar } from '../../../components';
import { LinkedAgentCount, AgentPolicyActionMenu } from '../components';
import { CreateAgentPolicyFlyout } from './components';

const AgentPolicyListPageLayout: React.FunctionComponent = ({ children }) => (
  <WithHeaderLayout
    leftColumn={
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.ingestManager.agentPolicyList.pageTitle"
                defaultMessage="Agent policies"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued">
            <p>
              <FormattedMessage
                id="xpack.ingestManager.agentPolicyList.pageSubtitle"
                defaultMessage="Use agent policies to manage your agents and the data they collect."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    }
  >
    {children}
  </WithHeaderLayout>
);

export const AgentPolicyListPage: React.FunctionComponent<{}> = () => {
  useBreadcrumbs('policies_list');
  const { getHref, getPath } = useLink();
  const hasWriteCapabilites = useCapabilities().write;
  const {
    fleet: { enabled: isFleetEnabled },
  } = useConfig();

  // Table and search states
  const { urlParams, toUrlParams } = useUrlParams();
  const [search, setSearch] = useState<string>(
    Array.isArray(urlParams.kuery)
      ? urlParams.kuery[urlParams.kuery.length - 1]
      : urlParams.kuery ?? ''
  );
  const { pagination, pageSizeOptions, setPagination } = usePagination();
  const { sorting, setSorting } = useSorting<AgentPolicy>({
    field: 'updated_at',
    direction: 'desc',
  });
  const history = useHistory();
  const isCreateAgentPolicyFlyoutOpen = 'create' in urlParams;
  const setIsCreateAgentPolicyFlyoutOpen = useCallback(
    (isOpen: boolean) => {
      if (isOpen !== isCreateAgentPolicyFlyoutOpen) {
        if (isOpen) {
          history.push(
            `${getPath('policies_list')}?${toUrlParams({ ...urlParams, create: null })}`
          );
        } else {
          const { create, ...params } = urlParams;
          history.push(`${getPath('policies_list')}?${toUrlParams(params)}`);
        }
      }
    },
    [getPath, history, isCreateAgentPolicyFlyoutOpen, toUrlParams, urlParams]
  );

  // Fetch agent policies
  const { isLoading, data: agentPolicyData, sendRequest } = useGetAgentPolicies({
    page: pagination.currentPage,
    perPage: pagination.pageSize,
    sortField: sorting?.field,
    sortOrder: sorting?.direction,
    kuery: search,
  });

  // Some policies retrieved, set up table props
  const columns = useMemo(() => {
    const cols: Array<
      EuiTableFieldDataColumnType<AgentPolicy> | EuiTableActionsColumnType<AgentPolicy>
    > = [
      {
        field: 'name',
        sortable: true,
        name: i18n.translate('xpack.ingestManager.agentPolicyList.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        width: '20%',
        render: (name: string, agentPolicy: AgentPolicy) => (
          <EuiFlexGroup gutterSize="s" alignItems="baseline" style={{ minWidth: 0 }}>
            <EuiFlexItem grow={false} className="eui-textTruncate">
              <EuiLink
                className="eui-textTruncate"
                href={getHref('policy_details', { policyId: agentPolicy.id })}
                title={name || agentPolicy.id}
              >
                {name || agentPolicy.id}
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiText color="subdued" size="xs" style={{ whiteSpace: 'nowrap' }}>
                <FormattedMessage
                  id="xpack.ingestManager.agentPolicyList.revisionNumber"
                  defaultMessage="rev. {revNumber}"
                  values={{ revNumber: agentPolicy.revision }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'description',
        name: i18n.translate('xpack.ingestManager.agentPolicyList.descriptionColumnTitle', {
          defaultMessage: 'Description',
        }),
        width: '35%',
        render: (value: string) => (
          <EuiTextColor color="subdued" className="eui-textTruncate" title={value}>
            {value}
          </EuiTextColor>
        ),
      },
      {
        field: 'updated_at',
        sortable: true,
        name: i18n.translate('xpack.ingestManager.agentPolicyList.updatedOnColumnTitle', {
          defaultMessage: 'Last updated on',
        }),
        render: (date: AgentPolicy['updated_at']) => (
          <FormattedDate value={date} year="numeric" month="short" day="2-digit" />
        ),
      },
      {
        field: 'agents',
        name: i18n.translate('xpack.ingestManager.agentPolicyList.agentsColumnTitle', {
          defaultMessage: 'Agents',
        }),
        dataType: 'number',
        render: (agents: number, agentPolicy: AgentPolicy) => (
          <LinkedAgentCount count={agents} agentPolicyId={agentPolicy.id} />
        ),
      },
      {
        field: 'package_policies',
        name: i18n.translate(
          'xpack.ingestManager.agentPolicyList.packagePoliciesCountColumnTitle',
          {
            defaultMessage: 'Integrations',
          }
        ),
        dataType: 'number',
        render: (packagePolicies: AgentPolicy['package_policies']) =>
          packagePolicies ? packagePolicies.length : 0,
      },
      {
        name: i18n.translate('xpack.ingestManager.agentPolicyList.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: (agentPolicy: AgentPolicy) => (
              <AgentPolicyActionMenu
                agentPolicy={agentPolicy}
                onCopySuccess={() => sendRequest()}
              />
            ),
          },
        ],
      },
    ];

    // If Fleet is not enabled, then remove the `agents` column
    if (!isFleetEnabled) {
      return cols.filter((col) => ('field' in col ? col.field !== 'agents' : true));
    }

    return cols;
  }, [getHref, isFleetEnabled, sendRequest]);

  const createAgentPolicyButton = useMemo(
    () => (
      <EuiButton
        fill
        iconType="plusInCircle"
        isDisabled={!hasWriteCapabilites}
        onClick={() => setIsCreateAgentPolicyFlyoutOpen(true)}
      >
        <FormattedMessage
          id="xpack.ingestManager.agentPolicyList.addButton"
          defaultMessage="Create agent policy"
        />
      </EuiButton>
    ),
    [hasWriteCapabilites, setIsCreateAgentPolicyFlyoutOpen]
  );

  const emptyPrompt = useMemo(
    () => (
      <EuiEmptyPrompt
        title={
          <h2>
            <FormattedMessage
              id="xpack.ingestManager.agentPolicyList.noAgentPoliciesPrompt"
              defaultMessage="No agent policies"
            />
          </h2>
        }
        actions={createAgentPolicyButton}
      />
    ),
    [createAgentPolicyButton]
  );

  const onTableChange = (criteria: CriteriaWithPagination<AgentPolicy>) => {
    const newPagination = {
      ...pagination,
      currentPage: criteria.page.index + 1,
      pageSize: criteria.page.size,
    };
    setPagination(newPagination);
    setSorting(criteria.sort);
  };

  return (
    <AgentPolicyListPageLayout>
      {isCreateAgentPolicyFlyoutOpen ? (
        <CreateAgentPolicyFlyout
          onClose={() => {
            setIsCreateAgentPolicyFlyoutOpen(false);
            sendRequest();
          }}
        />
      ) : null}
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
          <EuiButton color="primary" iconType="refresh" onClick={() => sendRequest()}>
            <FormattedMessage
              id="xpack.ingestManager.agentPolicyList.reloadAgentPoliciesButtonText"
              defaultMessage="Reload"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{createAgentPolicyButton}</EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiBasicTable<AgentPolicy>
        loading={isLoading}
        hasActions={true}
        noItemsMessage={
          isLoading ? (
            <FormattedMessage
              id="xpack.ingestManager.agentPolicyList.loadingAgentPoliciesMessage"
              defaultMessage="Loading agent policies…"
            />
          ) : !search.trim() && (agentPolicyData?.total ?? 0) === 0 ? (
            emptyPrompt
          ) : (
            <FormattedMessage
              id="xpack.ingestManager.agentPolicyList.noFilteredAgentPoliciesPrompt"
              defaultMessage="No agent policies found. {clearFiltersLink}"
              values={{
                clearFiltersLink: (
                  <EuiLink onClick={() => setSearch('')}>
                    <FormattedMessage
                      id="xpack.ingestManager.agentPolicyList.clearFiltersLinkText"
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
    </AgentPolicyListPageLayout>
  );
};
