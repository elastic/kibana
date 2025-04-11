/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  Comparators,
  Criteria,
  EuiAvatar,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiSpacer,
  EuiTableSortingType,
  EuiText,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Agent } from '../../../../../common/agents';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../app_paths';
import { CreateNewAssistantModal } from '../assistant_create_modal';

interface AssistantListViewProps {
  agents: Agent[];
}

export const AssistantListView: React.FC<AssistantListViewProps> = ({ agents }) => {
  const { navigateToWorkchatUrl } = useNavigation();

  const [sortField, setSortField] = useState<keyof Agent>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const columns: Array<EuiBasicTableColumn<Agent>> = [
    {
      field: 'name',
      name: 'Name',
      sortable: true,
      render: (name: Agent['name'], agent: Agent) => (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiAvatar
            size="m"
            name={agent.name}
            initials={agent.avatar?.text}
            color={agent.avatar?.color}
          />
          <EuiButtonEmpty
            onClick={() => navigateToWorkchatUrl(appPaths.assistants.edit({ agentId: agent.id }))}
          >
            {name}
          </EuiButtonEmpty>
        </EuiFlexGroup>
      ),
    },
    { field: 'user.name', name: 'Created by' },
    { field: 'public', name: 'Visibility' },
    {
      name: 'Actions',
      actions: [
        {
          name: 'Edit',
          description: 'Edit this agent',
          isPrimary: true,
          icon: 'documentEdit',
          type: 'icon',
          onClick: ({ id }) => {
            navigateToWorkchatUrl(appPaths.assistants.edit({ agentId: id }));
          },
          'data-test-subj': 'agentListTable-edit-btn',
        },
      ],
    },
  ];

  const findAgents = (
    agents: Agent[],
    pageIndex: number,
    pageSize: number,
    sortField: keyof Agent,
    sortDirection: 'asc' | 'desc'
  ) => {
    let items;

    if (sortField) {
      items = agents
        .slice(0)
        .sort(Comparators.property(sortField, Comparators.default(sortDirection)));
    } else {
      items = agents;
    }

    let pageOfItems;

    if (!pageIndex && !pageSize) {
      pageOfItems = items;
    } else {
      const startIndex = pageIndex * pageSize;
      pageOfItems = items.slice(startIndex, Math.min(startIndex + pageSize, agents.length));
    }

    return {
      pageOfItems,
      totalItemCount: agents.length,
    };
  };

  const { pageOfItems, totalItemCount } = findAgents(
    agents,
    pageIndex,
    pageSize,
    sortField,
    sortDirection
  );

  const headerButtons = [
    <EuiButton
      iconType={'plusInCircle'}
      color="primary"
      fill
      iconSide="left"
      onClick={() => setCreateModalOpen(true)}
    >
      New
    </EuiButton>,
    <EuiButtonEmpty iconType={'questionInCircle'} color="primary" iconSide="left" href="/">
      Learn more
    </EuiButtonEmpty>,
  ];

  const sorting: EuiTableSortingType<Agent> = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: [10, 20, 50],
  };

  const onTableChange = ({ page, sort }: Criteria<Agent>) => {
    if (page) {
      const { index: pageIndex, size: pageSize } = page;
      setPageIndex(pageIndex);
      setPageSize(pageSize);
    }
    if (sort) {
      const { field: sortField, direction: sortDirection } = sort;
      setSortField(sortField);
      setSortDirection(sortDirection);
    }
  };

  const resultsCount = (
    <FormattedMessage
      id="workchatApp.assistants.list.resultsCountLabel"
      defaultMessage="Showing {start}-{end} of {total}"
      values={{
        start: <strong>{pageSize * pageIndex + 1}</strong>,
        end: <strong>{pageSize * pageIndex + pageSize}</strong>,
        total: totalItemCount,
      }}
    />
  );

  return (
    <KibanaPageTemplate data-test-subj="workChatAssistantsListPage">
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('workchatApp.assistants.pageTitle', {
          defaultMessage: 'Assistants',
        })}
        description={i18n.translate('workchatApp.assistants.pageDescription', {
          defaultMessage:
            'An assistant is an AI helper built around your data. It can search, summarize, and take action using your connected integrations. You can manage or create assistants from here.',
        })}
        rightSideItems={headerButtons}
      />

      <KibanaPageTemplate.Section>
        <EuiText size="xs">{resultsCount}</EuiText>
        <EuiSpacer size="m" />

        <EuiBasicTable
          columns={columns}
          items={pageOfItems}
          sorting={sorting}
          onChange={onTableChange}
          pagination={pagination}
        />
        {createModalOpen && <CreateNewAssistantModal onClose={() => setCreateModalOpen(false)} />}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
