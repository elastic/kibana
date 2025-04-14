/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  Criteria,
  EuiAccordion,
  EuiAvatar,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  IconType,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { IntegrationType, Status } from '@kbn/wci-common';
import type { Integration } from '../../../../../common/integrations';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../app_paths';
import { integrationTypeToLabel, getIntegrationIcon } from '../utils';
import { useAgentList } from '../../../hooks/use_agent_list';

interface IntegrationListViewProps {
  integrations: Integration[];
}

export const IntegrationListView: React.FC<IntegrationListViewProps> = ({ integrations }) => {
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [selectedTabId, setSelectedTabId] = useState('active');
  const { agents } = useAgentList();

  const toggleItem = (itemId: string) => {
    setSelectedItems({
      ...selectedItems,
      [itemId]: !selectedItems[itemId],
    });
  };

  const { navigateToWorkchatUrl } = useNavigation();
  const columns: Array<EuiBasicTableColumn<Integration>> = [
    {
      field: 'dropDown',
      width: '30px',
      name: '',
      render: (_, item: Integration) => (
        <EuiAccordion id={`accordion-${item.id}`} buttonContent="" paddingSize="s">
          <EuiPanel color="subdued">
            <EuiText size="s" />
          </EuiPanel>
        </EuiAccordion>
      ),
    },
    {
      field: 'selection',
      width: '40px',
      name: '',
      render: (_, item: Integration) => (
        <EuiCheckbox
          id={`checkbox-${item.id}`}
          checked={!!selectedItems[item.id]}
          onChange={() => toggleItem(item.id)}
          aria-label={`Select ${item.name}`}
        />
      ),
    },
    {
      field: 'name',
      name: 'Name',
      render: (_, item: Integration) => (
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={getIntegrationIcon(item.type) as IconType}
              size='m'
            />
          </EuiFlexItem>
          <EuiFlexItem>{item.name}</EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'type',
      name: 'Type',
      render: (type: IntegrationType) => integrationTypeToLabel(type),
    },
    {
      field: 'status',
      name: 'Status',
      render: (status: Status) => <EuiHealth color="green">Healthy</EuiHealth>,
    },
    {
      field: 'used_in',
      name: 'Used in...',
      render: () => (
        <EuiFlexGroup gutterSize="none">
          {agents.map((agent) => (
            <EuiAvatar key={agent.id || agent.name} size="s" name={agent.name} />
          ))}
        </EuiFlexGroup>
      ),
    },
    {
      name: 'Actions',
      actions: [
        {
          name: 'Edit',
          description: 'Edit this integration',
          isPrimary: true,
          icon: 'documentEdit',
          type: 'icon',
          onClick: ({ id }) => {
            navigateToWorkchatUrl(appPaths.integrations.edit({ integrationId: id }));
          },
          'data-test-subj': 'integrationListTable-edit-btn',
        },
      ],
    },
  ];

  const renderTabs = () => [
    {
      id: 'active',
      label: 'Active',
      isSelected: selectedTabId === 'active',
      onClick: () => setSelectedTabId('active'),
    },
    {
      id: 'catalog',
      label: 'Catalog',
      isSelected: selectedTabId === 'catalog',
      onClick: () => setSelectedTabId('catalog'),
    },
  ];
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const onTableChange = ({ page }: Criteria<Integration>) => {
    if (page) {
      const { index: pageIndex, size: pageSize } = page;
      setPageIndex(pageIndex);
      setPageSize(pageSize);
    }
  };

  const findIntegrations = (integrations: Integration[], pageIndex: number, pageSize: number) => {
    let pageOfItems;

    if (!pageIndex && !pageSize) {
      pageOfItems = integrations;
    } else {
      const startIndex = pageIndex * pageSize;
      pageOfItems = integrations.slice(
        startIndex,
        Math.min(startIndex + pageSize, integrations.length)
      );
    }

    return {
      pageOfItems,
      totalItemCount: integrations.length,
    };
  };

  const { pageOfItems, totalItemCount } = findIntegrations(integrations, pageIndex, pageSize);

  const resultsCount =
    pageSize === 0 ? (
      <strong>All</strong>
    ) : (
      <>
        <strong>
          {pageSize * pageIndex + 1}-{pageSize * pageIndex + pageSize}
        </strong>{' '}
        of {totalItemCount}
      </>
    );

  return (
    <KibanaPageTemplate data-test-subj="integrationsListPage">
      <KibanaPageTemplate.Header
        pageTitle="Integrations"
        description="Connect to your tools and data so you can easily find, understand, and act on the information that matters."
        tabs={renderTabs()}
        rightSideItems={[
          <EuiButton
            onClick={() => {
              return navigateToWorkchatUrl(appPaths.integrations.create);
            }}
            iconType="plusInCircle"
            color="primary"
            fill
          >
            Add Integration
          </EuiButton>,
        ]}
      />
      <EuiHorizontalRule margin="none" css={{ height: 2 }} />
      {selectedTabId === 'active' && (
        <KibanaPageTemplate.Section>
          <EuiText size="xs">Showing {resultsCount}</EuiText>
          <EuiSpacer size="s" />
          <EuiBasicTable
            columns={columns}
            items={pageOfItems}
            pagination={{
              pageIndex,
              pageSize,
              totalItemCount,
              pageSizeOptions: [5, 10, 20, 50],
              showPerPageOptions: true,
            }}
            onChange={onTableChange}
          />
        </KibanaPageTemplate.Section>
      )}
    </KibanaPageTemplate>
  );
};
