/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useState } from 'react';
import {
  Comparators,
  Criteria,
  EuiAvatar,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonIcon,
  EuiCheckbox,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiTableSelectionType,
  EuiTableSortingType,
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
import { integrationLabels } from '../i18n';

interface IntegrationListViewProps {
  integrations: Integration[];
}

export const IntegrationListView: React.FC<IntegrationListViewProps> = ({ integrations }) => {
  const [selectedTabId, setSelectedTabId] = useState('active');

  const { agents } = useAgentList();

  const [selectedItems, setSelectedItems] = useState<Integration[]>([]);

  const [sortField, setSortField] = useState<keyof Integration>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { navigateToWorkchatUrl } = useNavigation();
  const columns: Array<EuiBasicTableColumn<Integration>> = [
    {
      field: 'name',
      name: 'Name',
      sortable: true,
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

  const sorting: EuiTableSortingType<Integration> = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const onTableChange = ({ page, sort }: Criteria<Integration>) => {
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

  const findIntegrations = (integrations: Integration[], pageIndex: number, pageSize: number, sortField: keyof Integration, sortDirection: 'asc' | 'desc') => {
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

    if (sortField) {
      pageOfItems = integrations
        .slice(0)
        .sort(
          Comparators.property(sortField, Comparators.default(sortDirection))
        );
    } else {
      pageOfItems = integrations;
    }

    return {
      pageOfItems,
      totalItemCount: integrations.length,
    };
  };

  const { pageOfItems, totalItemCount } = findIntegrations(integrations, pageIndex, pageSize, sortField, sortDirection);

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
  
    const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
      Record<string, ReactNode>
    >({});

  const toggleDetails = (item: Integration) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

    if (itemIdToExpandedRowMapValues[item.id]) {
      delete itemIdToExpandedRowMapValues[item.id];
    } else {
      
      itemIdToExpandedRowMapValues[item.id] = (
        //TODO: set component for expand rows
        <EuiDescriptionList />
      );
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const selectionColumn: EuiBasicTableColumn<Integration> = {
    field: 'selection',
    width: '40px',
    color:'black',
    name: (
      <EuiCheckbox
        id="selectAllCheckbox"
        color='text'
        checked={pageOfItems.length > 0 && pageOfItems.every(item => 
          selectedItems.some(selected => selected.id === item.id)
        )}
        indeterminate={
          pageOfItems.some(item => 
            selectedItems.some(selected => selected.id === item.id)
          ) && 
          !pageOfItems.every(item => 
            selectedItems.some(selected => selected.id === item.id)
          )
        }
        onChange={() => {
          if (pageOfItems.every(item => 
            selectedItems.some(selected => selected.id === item.id)
          )) {
            setSelectedItems(selectedItems.filter(selected => 
              !pageOfItems.some(pageItem => pageItem.id === selected.id)
            ));
          } else {
            const newSelectedItems = [...selectedItems];
            pageOfItems.forEach(item => {
              if (!selectedItems.some(selected => selected.id === item.id)) {
                newSelectedItems.push(item);
              }
            });
            setSelectedItems(newSelectedItems);
          }
        }}
        aria-label="Select all rows"
      />
    ),
    render: (_, item: Integration) => (
      <EuiCheckbox
        id={`select-${item.id}`}
        color='text'
        checked={selectedItems.some(selected => selected.id === item.id)}
        onChange={() => {
          if (selectedItems.some(selected => selected.id === item.id)) {
            setSelectedItems(selectedItems.filter(selected => selected.id !== item.id));
          } else {
            setSelectedItems([...selectedItems, item]);
          }
        }}
        aria-label={`Select ${item.name || 'this row'}`}
      />
    ),
  };

  const columnsWithExpandingRowToggle: Array<EuiBasicTableColumn<Integration>> = [
    {
      align: 'left',
      width: '40px',
      isExpander: true,
      name: (
        <EuiIcon size='m' type='fold'/>
      ),
      mobileOptions: { header: false },
      render: (item: Integration) => {
        const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

        return (
          <EuiButtonIcon
            color='text'
            onClick={() => toggleDetails(item)}
            aria-label={
              itemIdToExpandedRowMapValues[item.id] ? 'Collapse' : 'Expand'
            }
            iconType={
              itemIdToExpandedRowMapValues[item.id] ? 'arrowDown' : 'arrowRight'
            }
          />
        );
      },
    },
    selectionColumn,
    ...columns,
  ];

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
            {integrationLabels.listView.addIntegrationLabel}
          </EuiButton>,
        ]}
      />
      <EuiHorizontalRule margin="none" css={{ height: 2 }} />
      {selectedTabId === 'active' && (
        <KibanaPageTemplate.Section>
          <EuiText size="xs">Showing {resultsCount}</EuiText>
          <EuiSpacer size="s" />
          <EuiBasicTable
            columns={columnsWithExpandingRowToggle}
            items={pageOfItems}
            itemId="id"
            itemIdToExpandedRowMap={itemIdToExpandedRowMap}
            pagination={{
              pageIndex,
              pageSize,
              totalItemCount,
              pageSizeOptions: [5, 10, 20, 50],
              showPerPageOptions: true,
            }}
            sorting={sorting}
            onChange={onTableChange}
          />
        </KibanaPageTemplate.Section>
      )}
      
    </KibanaPageTemplate>
  );
};
