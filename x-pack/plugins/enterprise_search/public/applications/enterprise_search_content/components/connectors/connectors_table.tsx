/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  CriteriaWithPagination,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Connector, ConnectorStatus } from '@kbn/search-connectors';

import { Meta } from '../../../../../common/types/pagination';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiLinkTo } from '../../../shared/react_router_helpers/eui_components';
import { SEARCH_INDEX_PATH } from '../../routes';
import {
  connectorStatusToColor,
  connectorStatusToText,
} from '../../utils/connector_status_helpers';

import { ConnectorType } from './connector_type';
import { ConnectorViewItem } from './connectors_logic';

interface ConnectorsTableProps {
  isLoading?: boolean;
  items: ConnectorViewItem[];
  meta?: Meta;
  onChange: (criteria: CriteriaWithPagination<Connector>) => void;
}
export const ConnectorsTable: React.FC<ConnectorsTableProps> = ({
  items,
  meta = {
    page: {
      from: 0,
      size: 10,
      total: 0,
    },
  },
  onChange,
  isLoading,
}) => {
  const { navigateToUrl } = useValues(KibanaLogic);
  const columns: Array<EuiBasicTableColumn<ConnectorViewItem>> = [
    {
      field: 'name',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorTable.columns.connectorName',
        {
          defaultMessage: 'Connector name',
        }
      ),
      width: '25%',
    },
    {
      field: 'index_name',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorTable.columns.indexName',
        {
          defaultMessage: 'Index name',
        }
      ),
      render: (indexName: string) =>
        indexName ? (
          <EuiLinkTo to={generateEncodedPath(SEARCH_INDEX_PATH, { indexName })}>
            {indexName}
          </EuiLinkTo>
        ) : (
          '--'
        ),
      width: '25%',
    },
    {
      field: 'docsCount',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorTable.columns.docsCount',
        {
          defaultMessage: 'Docs count',
        }
      ),
      truncateText: true,
    },
    {
      field: 'service_type',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorTable.columns.type',
        {
          defaultMessage: 'Connector type',
        }
      ),
      render: (serviceType: string) => <ConnectorType serviceType={serviceType} />,
      truncateText: true,
      width: '25%',
    },
    {
      field: 'status',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorTable.columns.status',
        {
          defaultMessage: 'Ingestion status',
        }
      ),
      render: (connectorStatus: ConnectorStatus) => {
        const label = connectorStatusToText(connectorStatus);
        return <EuiBadge color={connectorStatusToColor(connectorStatus)}>{label}</EuiBadge>;
      },
      truncateText: true,
    },
    {
      actions: [
        {
          description: i18n.translate(
            'xpack.enterpriseSearch.content.connectors.connectorTable.columns.actions.viewIndex',
            { defaultMessage: 'View this connector' }
          ),
          enabled: (connector) => !!connector.index_name,
          icon: 'eye',
          isPrimary: false,
          name: (connector) =>
            i18n.translate(
              'xpack.enterpriseSearch.content.connectors.connectorsTable.columns.actions.viewIndex.caption',
              {
                defaultMessage: 'View index {connectorName}',
                values: {
                  connectorName: connector.name,
                },
              }
            ),
          onClick: (connector) => {
            navigateToUrl(
              generateEncodedPath(SEARCH_INDEX_PATH, {
                indexName: connector.index_name || '',
              })
            );
          },
          type: 'icon',
        },
      ],
      name: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorTable.columns.actions',
        {
          defaultMessage: 'Actions',
        }
      ),
    },
  ];
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiBasicTable
          items={items}
          columns={columns}
          onChange={onChange}
          tableLayout="fixed"
          loading={isLoading}
          pagination={{
            pageIndex: meta.page.from / (meta.page.size || 1),
            pageSize: meta.page.size,
            showPerPageOptions: false,
            totalItemCount: meta.page.total,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
