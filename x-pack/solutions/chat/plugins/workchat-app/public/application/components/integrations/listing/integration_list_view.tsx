/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiBasicTable, EuiBasicTableColumn, EuiButton, EuiCheckbox, EuiFlexGroup, EuiFlexItem, EuiHealth, EuiIcon, EuiSpacer, EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { IntegrationType, Status} from '@kbn/wci-common';
import type { Integration } from '../../../../../common/integrations';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../app_paths';
import { integrationTypeToLabel } from '../utils';

interface IntegrationListViewProps {
  integrations: Integration[];
}

export const IntegrationListView: React.FC<IntegrationListViewProps> = ({ integrations }) => {
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [selectedTabId, setSelectedTabId] = useState('active');
  
  const onTabClick = (selectedTab: { id: string }) => {
    setSelectedTabId(selectedTab.id);
  };
  const toggleItem = (itemId: string) => {
    setSelectedItems({
      ...selectedItems,
      [itemId]: !selectedItems[itemId]
    });
  };
  const { navigateToWorkchatUrl } = useNavigation();

  const tabs = [
    {
      id: 'active',
      name: 'Active',
      disabled: false,
    },
    {
      id: 'catalog',
      name: 'Catalog',
      disabled: false,
    },

  ];

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
    totalItemCount: 0,
  });
  
  const [displayedItems, setDisplayedItems] = useState<Integration[]>([]);
  
  useEffect(() => {
    const startIndex = pagination.pageIndex * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    setDisplayedItems(integrations.slice(startIndex, endIndex));
    setPagination({
      ...pagination,
      totalItemCount: integrations.length,
    });
  }, [pagination.pageIndex, pagination.pageSize, integrations]);
   
  const columns: Array<EuiBasicTableColumn<Integration>> = [
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
      )
    },
    { field: 'name', 
      name: 'Name',
      render: (name: String) => (
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
          <EuiIcon type="document" />
          </EuiFlexItem>
          <EuiFlexItem>
            {name}
          </EuiFlexItem>
        </EuiFlexGroup>
      ) },
    {
      field: 'type',
      name: 'Type',
      render: (type: IntegrationType) => integrationTypeToLabel(type),
    },
    { field: 'status', 
      name: 'Status',
      render: (status: Status) => <EuiHealth color='green'>Connected</EuiHealth>},
    { field: 'used_in', name: 'Used in...' },
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

  const renderTabs = () => {
    return tabs.map((tab) => (
      <EuiTab
        key={tab.id}
        onClick={() => onTabClick(tab)}
        isSelected={tab.id === selectedTabId}
        disabled={tab.disabled}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return (
    <KibanaPageTemplate panelled>
      <KibanaPageTemplate.Header pageTitle="Integrations" description="Connect to your tools and data so you can easily find, understand, and act on the information that matters "/>
        
      <KibanaPageTemplate.Section grow={false} paddingSize="m">
      <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => {
                return navigateToWorkchatUrl(appPaths.integrations.create);
              }}
              iconType="plusInCircle"
            >
              Add integration
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>

      <KibanaPageTemplate.Section>
        <EuiTabs>{renderTabs()}</EuiTabs>
          <EuiSpacer size="m" />
          
          {selectedTabId === 'active' && (
            <EuiBasicTable 
            columns={columns} 
            items={integrations}
            pagination={{
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
              totalItemCount: pagination.totalItemCount,
              pageSizeOptions: [5, 10, 20, 50],
              showPerPageOptions: true,
            }}
            onChange={({}) => {}}
            />
        )}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
