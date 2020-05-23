/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { CSSProperties, memo, useCallback, useMemo, useState } from 'react';
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
  EuiContextMenuItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedDate } from '@kbn/i18n/react';
import { useHistory } from 'react-router-dom';
import { AgentConfig } from '../../../types';
import {
  AGENT_CONFIG_DETAILS_PATH,
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
  AGENT_CONFIG_PATH,
} from '../../../constants';
import { WithHeaderLayout } from '../../../layouts';
import {
  useCapabilities,
  useGetAgentConfigs,
  usePagination,
  useLink,
  useConfig,
  useUrlParams,
} from '../../../hooks';
import { CreateAgentConfigFlyout } from './components';
import { SearchBar } from '../../../components/search_bar';
import { LinkedAgentCount } from '../components';
import { useAgentConfigLink } from '../details_page/hooks/use_details_uri';
import { TableRowActions } from '../components/table_row_actions';

const NO_WRAP_TRUNCATE_STYLE: CSSProperties = Object.freeze({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const AgentConfigListPageLayout: React.FunctionComponent = ({ children }) => (
  <WithHeaderLayout
    leftColumn={
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.ingestManager.agentConfigList.pageTitle"
                defaultMessage="Agent Configurations"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued">
            <p>
              <FormattedMessage
                id="xpack.ingestManager.agentConfigList.pageSubtitle"
                defaultMessage="Use agent configurations to manage your agents and the data they collect."
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

const ConfigRowActions = memo<{ config: AgentConfig; onDelete: () => void }>(
  ({ config, onDelete }) => {
    const hasWriteCapabilities = useCapabilities().write;
    const detailsLink = useAgentConfigLink('details', { configId: config.id });
    const addDatasourceLink = useAgentConfigLink('add-datasource', { configId: config.id });

    return (
      <TableRowActions
        items={[
          <EuiContextMenuItem icon="inspect" href={detailsLink} key="viewConfig">
            <FormattedMessage
              id="xpack.ingestManager.agentConfigList.viewConfigActionText"
              defaultMessage="View configuration"
            />
          </EuiContextMenuItem>,

          <EuiContextMenuItem
            disabled={!hasWriteCapabilities}
            icon="plusInCircle"
            href={addDatasourceLink}
            key="createDataSource"
          >
            <FormattedMessage
              id="xpack.ingestManager.agentConfigList.createDatasourceActionText"
              defaultMessage="Create data source"
            />
          </EuiContextMenuItem>,
          // <EuiContextMenuItem disabled={true} icon="copy" key="copyConfig">
          //   <FormattedMessage
          //     id="xpack.ingestManager.agentConfigList.copyConfigActionText"
          //     defaultMessage="Copy configuration"
          //   />
          // </EuiContextMenuItem>,
        ]}
      />
    );
  }
);

export const AgentConfigListPage: React.FunctionComponent<{}> = () => {
  // Config information
  const hasWriteCapabilites = useCapabilities().write;
  const {
    fleet: { enabled: isFleetEnabled },
  } = useConfig();

  // Base URL paths
  const DETAILS_URI = useLink(AGENT_CONFIG_DETAILS_PATH);

  // Table and search states
  const { urlParams, toUrlParams } = useUrlParams();
  const [search, setSearch] = useState<string>(
    Array.isArray(urlParams.kuery)
      ? urlParams.kuery[urlParams.kuery.length - 1]
      : urlParams.kuery ?? ''
  );
  const { pagination, pageSizeOptions, setPagination } = usePagination();
  const history = useHistory();
  const isCreateAgentConfigFlyoutOpen = 'create' in urlParams;
  const setIsCreateAgentConfigFlyoutOpen = useCallback(
    (isOpen: boolean) => {
      if (isOpen !== isCreateAgentConfigFlyoutOpen) {
        if (isOpen) {
          history.push(`${AGENT_CONFIG_PATH}?${toUrlParams({ ...urlParams, create: null })}`);
        } else {
          const { create, ...params } = urlParams;
          history.push(`${AGENT_CONFIG_PATH}?${toUrlParams(params)}`);
        }
      }
    },
    [history, isCreateAgentConfigFlyoutOpen, toUrlParams, urlParams]
  );

  // Fetch agent configs
  const { isLoading, data: agentConfigData, sendRequest } = useGetAgentConfigs({
    page: pagination.currentPage,
    perPage: pagination.pageSize,
    kuery: search,
  });

  // Some configs retrieved, set up table props
  const columns = useMemo(() => {
    const cols: Array<
      EuiTableFieldDataColumnType<AgentConfig> | EuiTableActionsColumnType<AgentConfig>
    > = [
      {
        field: 'name',
        name: i18n.translate('xpack.ingestManager.agentConfigList.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        width: '20%',
        render: (name: string, agentConfig: AgentConfig) => (
          <EuiFlexGroup gutterSize="s" alignItems="baseline" style={{ minWidth: 0 }}>
            <EuiFlexItem grow={false} style={NO_WRAP_TRUNCATE_STYLE}>
              <EuiLink
                href={`${DETAILS_URI}${agentConfig.id}`}
                style={NO_WRAP_TRUNCATE_STYLE}
                title={name || agentConfig.id}
              >
                {name || agentConfig.id}
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiText color="subdued" size="xs" style={{ whiteSpace: 'nowrap' }}>
                <FormattedMessage
                  id="xpack.ingestManager.agentConfigList.revisionNumber"
                  defaultMessage="rev. {revNumber}"
                  values={{ revNumber: agentConfig.revision }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'description',
        name: i18n.translate('xpack.ingestManager.agentConfigList.descriptionColumnTitle', {
          defaultMessage: 'Description',
        }),
        width: '35%',
        truncateText: true,
        render: (description: AgentConfig['description']) => (
          <EuiTextColor color="subdued" style={NO_WRAP_TRUNCATE_STYLE}>
            {description}
          </EuiTextColor>
        ),
      },
      {
        field: 'updated_on',
        name: i18n.translate('xpack.ingestManager.agentConfigList.updatedOnColumnTitle', {
          defaultMessage: 'Last updated on',
        }),
        render: (date: AgentConfig['updated_on']) => (
          <FormattedDate value={date} year="numeric" month="short" day="2-digit" />
        ),
      },
      {
        field: 'agents',
        name: i18n.translate('xpack.ingestManager.agentConfigList.agentsColumnTitle', {
          defaultMessage: 'Agents',
        }),
        dataType: 'number',
        render: (agents: number, config: AgentConfig) => (
          <LinkedAgentCount count={agents} agentConfigId={config.id} />
        ),
      },
      {
        field: 'datasources',
        name: i18n.translate('xpack.ingestManager.agentConfigList.datasourcesCountColumnTitle', {
          defaultMessage: 'Data sources',
        }),
        dataType: 'number',
        render: (datasources: AgentConfig['datasources']) => (datasources ? datasources.length : 0),
      },
      {
        name: i18n.translate('xpack.ingestManager.agentConfigList.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: (config: AgentConfig) => (
              <ConfigRowActions config={config} onDelete={() => sendRequest()} />
            ),
          },
        ],
      },
    ];

    // If Fleet is not enabled, then remove the `agents` column
    if (!isFleetEnabled) {
      return cols.filter(col => ('field' in col ? col.field !== 'agents' : true));
    }

    return cols;
  }, [DETAILS_URI, isFleetEnabled, sendRequest]);

  const createAgentConfigButton = useMemo(
    () => (
      <EuiButton
        fill
        iconType="plusInCircle"
        isDisabled={!hasWriteCapabilites}
        onClick={() => setIsCreateAgentConfigFlyoutOpen(true)}
      >
        <FormattedMessage
          id="xpack.ingestManager.agentConfigList.addButton"
          defaultMessage="Create agent configuration"
        />
      </EuiButton>
    ),
    [hasWriteCapabilites, setIsCreateAgentConfigFlyoutOpen]
  );

  const emptyPrompt = useMemo(
    () => (
      <EuiEmptyPrompt
        title={
          <h2>
            <FormattedMessage
              id="xpack.ingestManager.agentConfigList.noAgentConfigsPrompt"
              defaultMessage="No agent configurations"
            />
          </h2>
        }
        actions={createAgentConfigButton}
      />
    ),
    [createAgentConfigButton]
  );

  return (
    <AgentConfigListPageLayout>
      {isCreateAgentConfigFlyoutOpen ? (
        <CreateAgentConfigFlyout
          onClose={() => {
            setIsCreateAgentConfigFlyoutOpen(false);
            sendRequest();
          }}
        />
      ) : null}
      <EuiFlexGroup alignItems={'center'} gutterSize="m">
        <EuiFlexItem grow={4}>
          <SearchBar
            value={search}
            onChange={newSearch => {
              setPagination({
                ...pagination,
                currentPage: 1,
              });
              setSearch(newSearch);
            }}
            fieldPrefix={AGENT_CONFIG_SAVED_OBJECT_TYPE}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton color="primary" iconType="refresh" onClick={() => sendRequest()}>
            <FormattedMessage
              id="xpack.ingestManager.agentConfigList.reloadAgentConfigsButtonText"
              defaultMessage="Reload"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{createAgentConfigButton}</EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiBasicTable
        loading={isLoading}
        hasActions={true}
        noItemsMessage={
          isLoading ? (
            <FormattedMessage
              id="xpack.ingestManager.agentConfigList.loadingAgentConfigsMessage"
              defaultMessage="Loading agent configurations…"
            />
          ) : !search.trim() && (agentConfigData?.total ?? 0) === 0 ? (
            emptyPrompt
          ) : (
            <FormattedMessage
              id="xpack.ingestManager.agentConfigList.noFilteredAgentConfigsPrompt"
              defaultMessage="No agent configurations found. {clearFiltersLink}"
              values={{
                clearFiltersLink: (
                  <EuiLink onClick={() => setSearch('')}>
                    <FormattedMessage
                      id="xpack.ingestManager.agentConfigList.clearFiltersLinkText"
                      defaultMessage="Clear filters"
                    />
                  </EuiLink>
                ),
              }}
            />
          )
        }
        items={agentConfigData ? agentConfigData.items : []}
        itemId="id"
        columns={columns}
        isSelectable={false}
        pagination={{
          pageIndex: pagination.currentPage - 1,
          pageSize: pagination.pageSize,
          totalItemCount: agentConfigData ? agentConfigData.total : 0,
          pageSizeOptions,
        }}
        onChange={({ page }: { page: { index: number; size: number } }) => {
          const newPagination = {
            ...pagination,
            currentPage: page.index + 1,
            pageSize: page.size,
          };
          setPagination(newPagination);
        }}
      />
    </AgentConfigListPageLayout>
  );
};
