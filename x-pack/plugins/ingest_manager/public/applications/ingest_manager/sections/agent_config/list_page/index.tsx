/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiPageBody,
  EuiPageContent,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiEmptyPrompt,
  // @ts-ignore
  EuiSearchBar,
  EuiBasicTable,
  EuiLink,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentConfig } from '../../../types';
import { DEFAULT_AGENT_CONFIG_ID, AGENT_CONFIG_DETAILS_PATH } from '../../../constants';
import { useGetAgentConfigs, usePagination, useLink } from '../../../hooks';
import { CreateAgentConfigFlyout } from './components';

// import { ConnectedLink, SearchBar, PolicyDeleteProvider } from '../../components';

export const AgentConfigListPage: React.FC<{}> = () => {
  // Create agent config flyout state
  const [isCreateAgentConfigFlyoutOpen, setIsCreateAgentConfigFlyoutOpen] = useState<boolean>(
    false
  );

  // Table and search states
  const [search, setSearch] = useState<string>('');
  const { pagination, setPagination } = usePagination();
  const [selectedAgentConfigs, setSelectedAgentConfigs] = useState<AgentConfig[]>([]);

  // Fetch agent configs
  const { isLoading, data: agentConfigData, sendRequest } = useGetAgentConfigs();

  // Base path for config details
  const DETAILS_URI = useLink(AGENT_CONFIG_DETAILS_PATH);

  // Some policies retrieved, set up table props
  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.ingestManager.agentConfigList.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      render: (name: string, agentConfig: AgentConfig) => name || agentConfig.id,
    },
    {
      field: 'namespace',
      name: i18n.translate('xpack.ingestManager.agentConfigList.namespaceColumnTitle', {
        defaultMessage: 'Namespace',
      }),
      render: (namespace: string) => (namespace ? <EuiBadge>{namespace}</EuiBadge> : null),
    },
    {
      field: 'description',
      name: i18n.translate('xpack.ingestManager.agentConfigList.descriptionColumnTitle', {
        defaultMessage: 'Description',
      }),
    },
    {
      field: 'datasources',
      name: i18n.translate('xpack.ingestManager.agentConfigList.datasourcesCountColumnTitle', {
        defaultMessage: 'Datasources',
      }),
      render: (datasources: AgentConfig['datasources']) => (datasources ? datasources.length : 0),
    },
    {
      name: i18n.translate('xpack.ingestManager.agentConfigList.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: ({ id }: AgentConfig) => {
            return (
              <EuiLink href={`${DETAILS_URI}${id}`}>
                <FormattedMessage
                  id="xpack.ingestManager.agentConfigList.viewActionLinkText"
                  defaultMessage="view"
                />
              </EuiLink>
            );
          },
        },
      ],
      width: '100px',
    },
  ];

  const emptyPrompt = (
    <EuiEmptyPrompt
      title={
        <h2>
          <FormattedMessage
            id="xpack.ingestManager.agentConfigList.noPoliciesPrompt"
            defaultMessage="No agent configurations"
          />
        </h2>
      }
      actions={
        // libs.framework.capabilities.write ? (
        // <EuiButton fill iconType="plusInCircle" onClick={() => setIsCreatePolicyFlyoutOpen(true)}>
        // ) : null
        <EuiButton
          fill
          iconType="plusInCircle"
          onClick={() => setIsCreateAgentConfigFlyoutOpen(true)}
        >
          <FormattedMessage
            id="xpack.ingestManager.agentConfigList.addButton"
            defaultMessage="Create new agent configuration"
          />
        </EuiButton>
      }
    />
  );

  return (
    <EuiPageBody>
      <EuiPageContent>
        {isCreateAgentConfigFlyoutOpen ? (
          <CreateAgentConfigFlyout
            onClose={() => {
              setIsCreateAgentConfigFlyoutOpen(false);
              sendRequest();
            }}
          />
        ) : null}

        <EuiTitle size="l">
          <h1>
            <FormattedMessage
              id="xpack.ingestManager.agentConfigList.pageTitle"
              defaultMessage="Agent configurations"
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems={'center'} justifyContent={'spaceBetween'}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <EuiText color="subdued">
                <FormattedMessage
                  id="xpack.ingestManager.agentConfigList.pageDescription"
                  defaultMessage="Lorem ipsum"
                />
              </EuiText>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />

        <EuiFlexGroup alignItems={'center'} gutterSize="m">
          {selectedAgentConfigs.length ? (
            <EuiFlexItem>
              {/* <PolicyDeleteProvider>
                {deletePoliciesPrompt => ( */}
              <EuiButton
                color="danger"
                onClick={() => {
                  // deletePoliciesPrompt(
                  //   selectedAgentConfigs.map(agentConfig => agentConfig.id),
                  //   () => {
                  //     // Reload policies if on first page and no search query, otherwise
                  //     // reset to first page and reset search, which will trigger a reload
                  //     if (pagination.currentPage === 1 && !search) {
                  //       fetch();
                  //     } else {
                  //       setPagination({
                  //         ...pagination,
                  //         currentPage: 1,
                  //       });
                  //       setSearch('');
                  //     }
                  //     selectedAgentConfigs([]);
                  //   }
                  // );
                }}
              >
                <FormattedMessage
                  id="xpack.ingestManager.agentConfigList.deleteButton"
                  defaultMessage="Delete {count, plural, one {# agent config} other {# agent configs}}"
                  values={{
                    count: selectedAgentConfigs.length,
                  }}
                />
              </EuiButton>
              {/* )}
              </PolicyDeleteProvider> */}
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={4}>
            {/* <SearchBar
              value={search}
              onChange={newSearch => {
                setPagination({
                  ...pagination,
                  currentPage: 1,
                });
                setSearch(newSearch);
              }}
              fieldPrefix="policies"
            /> */}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton color="secondary" iconType="refresh" onClick={() => sendRequest()}>
              <FormattedMessage
                id="xpack.ingestManager.agentConfigList.reloadPoliciesButtonText"
                defaultMessage="Reload"
              />
            </EuiButton>
          </EuiFlexItem>
          {/* {libs.framework.capabilities.write && ( */}
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="plusInCircle"
              onClick={() => setIsCreateAgentConfigFlyoutOpen(true)}
            >
              <FormattedMessage
                id="xpack.ingestManager.agentConfigList.addButton"
                defaultMessage="Create new agent configuration"
              />
            </EuiButton>
          </EuiFlexItem>
          {/* )} */}
        </EuiFlexGroup>

        <EuiSpacer size="m" />
        <EuiBasicTable
          loading={isLoading}
          noItemsMessage={
            isLoading ? (
              <FormattedMessage
                id="xpack.ingestManager.agentConfigList.loadingAgentConfigsMessage"
                defaultMessage="Loading agent configurations…"
              />
            ) : !search.trim() && agentConfigData?.total === 0 ? (
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
          isSelectable={true}
          selection={{
            selectable: (agentConfig: AgentConfig) => agentConfig.id !== DEFAULT_AGENT_CONFIG_ID,
            onSelectionChange: (newSelectedAgentConfigs: AgentConfig[]) => {
              setSelectedAgentConfigs(newSelectedAgentConfigs);
            },
          }}
          pagination={{
            pageIndex: pagination.currentPage - 1,
            pageSize: pagination.pageSize,
            totalItemCount: agentConfigData ? agentConfigData.total : 0,
          }}
          onChange={({ page }: { page: { index: number; size: number } }) => {
            const newPagination = {
              ...pagination,
              currentPage: page.index + 1,
              pageSize: page.size,
            };
            setPagination(newPagination);
            sendRequest(); // todo: fix this to send pagination options
          }}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
