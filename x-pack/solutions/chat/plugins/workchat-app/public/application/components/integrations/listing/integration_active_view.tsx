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
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTableSortingType,
  EuiText,
  IconType,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { IntegrationType } from '@kbn/wci-common';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import type { Integration } from '../../../../../common/integrations';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../app_paths';
import { integrationTypeToLabel, getIntegrationIcon } from '../utils';
import { useAgentList } from '../../../hooks/use_agent_list';
import { toolLabels } from '../i18n';
import { IntegrationListView } from './integration_list_view';
import { useIntegrationList } from '../../../hooks/use_integration_list';
export const IntegrationActiveView: React.FC = () => {
  const { agents } = useAgentList();
  const { integrations, isLoading } = useIntegrationList();
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
      name: i18n.translate('workchatApp.integrations.listView.integrationName', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      render: (_, item: Integration) => <EuiFlexItem>{item.name}</EuiFlexItem>,
    },
    {
      field: 'type',
      name: i18n.translate('workchatApp.integrations.listView.integrationType', {
        defaultMessage: 'Type',
      }),
      render: (type: IntegrationType) => integrationTypeToLabel(type),
    },
    {
      field: 'status',
      name: i18n.translate('workchatApp.integrations.listView.integrationStatus', {
        defaultMessage: 'Status',
      }),
      render: () => <EuiHealth color="green">Healthy</EuiHealth>,
    },
    {
      field: 'used_in',
      name: i18n.translate('workchatApp.integrations.listView.integrationsAgents', {
        defaultMessage: 'Used in...',
      }),
      render: () => (
        <EuiFlexGroup gutterSize="none">
          {agents.map((agent) => (
            <EuiAvatar key={agent.id || agent.name} size="s" name={agent.name} />
          ))}
        </EuiFlexGroup>
      ),
    },
    {
      name: i18n.translate('workchatApp.integrations.listView.actions', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: 'Edit',
          description: 'Edit this integration',
          isPrimary: true,
          icon: 'documentEdit',
          type: 'icon',
          onClick: ({ id }) => {
            navigateToWorkchatUrl(appPaths.tools.edit({ integrationId: id }));
          },
          'data-test-subj': 'integrationListTable-edit-btn',
        },
      ],
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
    ...columns,
  ];

  // emotion styling
  const horizontalRuleStyle = css`
    height: 2px;
  `;

  const loadingStyle = css`
    height: 300px;
  `;

  const noIntegrationStyle = css`
    width: 500px;
    height: 500px;
    margin: auto;
  `;

  const plugStyle = css`
    margin: auto;
    font-size: 50px;
  `;

  return (
    <KibanaPageTemplate data-test-subj="integrationsListPage">
      <IntegrationListView tab={'active'} />
      <EuiHorizontalRule margin="none" className={horizontalRuleStyle} />
      <KibanaPageTemplate.Section>
        {isLoading ? (
          <EuiFlexGroup alignItems="center" justifyContent="center" className={loadingStyle}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : integrations.length === 0 ? (
          <EuiFlexGroup alignItems="center" className={noIntegrationStyle}>
            <EuiPanel>
              <EuiFlexItem grow={false}>
                <span role="img" aria-label="plug emoji" className={plugStyle}>
                  <EuiIcon size="xxl" type="plugs" />
                </span>
              </EuiFlexItem>
              <EuiEmptyPrompt
                title={
                  <h2>
                    {i18n.translate('workchatApp.integrations.listView.noIntegrationTitle', {
                      defaultMessage: "You haven't connected anything",
                    })}
                  </h2>
                }
                body={i18n.translate('workchatApp.integrations.listView.noIntegrationBody', {
                  defaultMessage:
                    "Your connected tools will show up here once you've set up a tool. Until then, nothing for me to work with!",
                })}
                actions={
                  <EuiButton
                    onClick={() => {
                      navigateToWorkchatUrl(appPaths.tools.catalog);
                    }}
                    color="primary"
                    fill
                  >
                    {toolLabels.listView.browseToolLabel}
                  </EuiButton>
                }
              />
            </EuiPanel>
          </EuiFlexGroup>
        ) : (
          <>
            <EuiText size="xs">
              {i18n.translate('workchatApp.integrations.listView.pagination', {
                defaultMessage: 'Showing ',
              })}
              {resultsCount}
            </EuiText>
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
    </KibanaPageTemplate>
  );
};
