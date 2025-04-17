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
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTableSortingType,
  EuiText,
  IconType,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { IntegrationType } from '@kbn/wci-common';
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
  const { agents } = useAgentList();
  const { navigateToWorkchatUrl } = useNavigation();

  const columns: Array<EuiBasicTableColumn<Integration>> = [
    {
      field: 'icon',
      name: '',
      width: '30px',
      render: (_, item: Integration) => (
        <EuiFlexItem grow={false}>
          <EuiIcon type={getIntegrationIcon(item.type) as IconType} size="m" />
        </EuiFlexItem>
      ),
    },
    {
      field: 'name',
      name: 'Name',
      sortable: true,
      render: (_, item: Integration) => <EuiFlexItem>{item.name}</EuiFlexItem>,
    },
    {
      field: 'type',
      name: 'Type',
      render: (type: IntegrationType) => integrationTypeToLabel(type),
    },
    {
      field: 'status',
      name: 'Status',
      render: () => <EuiHealth color="green">Healthy</EuiHealth>,
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
          icon: 'boxesHorizontal',
          type: 'icon',
          onClick: ({ id }) => {
            navigateToWorkchatUrl(appPaths.integrations.edit({ integrationId: id }));
          },
          'data-test-subj': 'integrationListTable-edit-btn',
        },
      ],
    },
  ];

  // Create Tabs
  const [selectedTabId, setSelectedTabId] = useState('active');

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

  // Pagination and Sorting
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof Integration>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sorting: EuiTableSortingType<Integration> = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const onTableChange = ({ page, sort }: Criteria<Integration>) => {
    if (page) {
      const { index: index, size: size } = page;
      setPageIndex(index);
      setPageSize(size);
    }
    if (sort) {
      const { field: field, direction: direction } = sort;
      setSortField(field);
      setSortDirection(direction);
    }
  };

  const findIntegrations = (
    integrationItems: Integration[],
    index: number,
    size: number,
    field: keyof Integration,
    direction: 'asc' | 'desc'
  ) => {
    let pageOfItems;

    if (!index && !size) {
      pageOfItems = integrationItems;
    } else {
      const startIndex = index * size;
      pageOfItems = integrationItems.slice(
        startIndex,
        Math.min(startIndex + size, integrationItems.length)
      );
    }

    if (field) {
      pageOfItems = integrationItems
        .slice(0)
        .sort(Comparators.property(field, Comparators.default(direction)));
    } else {
      pageOfItems = integrationItems;
    }

    return {
      pageOfItems,
      totalItemCount: integrationItems.length,
    };
  };

  const { pageOfItems, totalItemCount } = findIntegrations(
    integrations,
    pageIndex,
    pageSize,
    sortField,
    sortDirection
  );

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

  // Selection
  const [selectedItems, setSelectedItems] = useState<Integration[]>([]);

  const selectionColumn: EuiBasicTableColumn<Integration> = {
    field: 'selection',
    width: '40px',
    color: 'black',
    name: (
      <EuiCheckbox
        id="selectAllCheckbox"
        color="text"
        checked={pageOfItems.every((item) =>
          selectedItems.some((selected) => selected.id === item.id)
        )}
        onChange={() => {
          if (
            pageOfItems.every((item) => selectedItems.some((selected) => selected.id === item.id))
          ) {
            setSelectedItems(
              selectedItems.filter(
                (selected) => !pageOfItems.some((pageItem) => pageItem.id === selected.id)
              )
            );
          } else {
            const newSelectedItems = [...selectedItems];
            pageOfItems.forEach((item) => {
              if (!selectedItems.some((selected) => selected.id === item.id)) {
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
        color="text"
        checked={selectedItems.some((selected) => selected.id === item.id)}
        onChange={() => {
          if (selectedItems.some((selected) => selected.id === item.id)) {
            setSelectedItems(selectedItems.filter((selected) => selected.id !== item.id));
          } else {
            setSelectedItems([...selectedItems, item]);
          }
        }}
        aria-label={`Select ${item.name || 'this row'}`}
      />
    ),
  };

  // Expandable Rows
  const [toggledItem, setToggledItem] = useState<string>('');
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const toggleDetails = (item: Integration) => {
    if (itemIdToExpandedRowMap[item.id]) {
      setItemIdToExpandedRowMap({});
      setToggledItem('');
    } else {
      setToggledItem(item.id);
      setItemIdToExpandedRowMap({
        [item.id]: (
          <EuiDescriptionList
            listItems={[
              {
                title: 'ID',
                description: item.id,
              },
              {
                title: 'Name',
                description: item.name,
              },
            ]}
          />
        ),
      });
    }
  };

  const columnsWithExpandingRowToggle: Array<EuiBasicTableColumn<Integration>> = [
    {
      align: 'left',
      width: '40px',
      isExpander: true,
      name: <EuiIcon size="m" type="unfold" />,
      mobileOptions: { header: false },
      render: (item: Integration) => {
        const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

        return (
          <EuiButtonIcon
            color="text"
            onClick={() => toggleDetails(item)}
            aria-label={itemIdToExpandedRowMapValues[item.id] ? 'Collapse' : 'Expand'}
            iconType={itemIdToExpandedRowMapValues[item.id] ? 'arrowDown' : 'arrowRight'}
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
          {integrations.length === 0 ? (
            <EuiFlexGroup
              alignItems="center"
              css={{
                width: '500px',
                height: '500px',
                margin: '0 auto',
              }}
            >
              <EuiPanel>
                <EuiFlexItem grow={false}>
                  <span
                    role="img"
                    aria-label="plug emoji"
                    style={{ margin: '0 auto', fontSize: '50px' }}
                  >
                    🔌
                  </span>
                </EuiFlexItem>
                <EuiEmptyPrompt
                  title={<h2>You haven&apos;t connected anything</h2>}
                  body="Your connected tools will show up here once you've set up an integration. Until then, nothing for me to work with!"
                  actions={
                    <EuiButton
                      onClick={() => {
                        setSelectedTabId('catalog');
                      }}
                      color="primary"
                      fill
                    >
                      {integrationLabels.listView.browseIntegrationLabel}
                    </EuiButton>
                  }
                />
              </EuiPanel>
            </EuiFlexGroup>
          ) : (
            <>
              <EuiText size="xs">Showing {resultsCount}</EuiText>
              <EuiSpacer size="s" />
              <EuiBasicTable
                columns={columnsWithExpandingRowToggle}
                items={pageOfItems}
                itemId="id"
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
              {toggledItem && (
                <KibanaPageTemplate.Section>
                  <EuiSpacer size="m" />
                  {itemIdToExpandedRowMap[toggledItem]}
                </KibanaPageTemplate.Section>
              )}
            </>
          )}
        </KibanaPageTemplate.Section>
      )}
    </KibanaPageTemplate>
  );
};
