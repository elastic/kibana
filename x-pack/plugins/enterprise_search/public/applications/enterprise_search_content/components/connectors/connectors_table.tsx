/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSearchBar,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiBadgeTo } from '../../../shared/react_router_helpers/eui_components';
import { IngestionStatus } from '../../types';
import {
  ingestionStatusToColor,
  ingestionStatusToText,
} from '../../utils/ingestion_status_helpers';

interface ConnectorItem {
  connector_name: string;
  docs_count: string;
  index_name: string;
  status: IngestionStatus;
  type: string;
}
interface ConnectorsTableProps {
  items: ConnectorItem[];
}
export const ConnectorsTable: React.FC<ConnectorsTableProps> = ({ items }) => {
  const columns: Array<EuiBasicTableColumn<ConnectorItem>> = [
    {
      field: 'connector_name',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorTable.columns.connectorName',
        {
          defaultMessage: 'Connector name',
        }
      ),
    },
    {
      field: 'index_name',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorTable.columns.indexName',
        {
          defaultMessage: 'Index name',
        }
      ),
    },
    {
      field: 'docs_count',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorTable.columns.docsCount',
        {
          defaultMessage: 'Docs count',
        }
      ),
    },
    {
      field: 'type',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorTable.columns.type',
        {
          defaultMessage: 'Connector type',
        }
      ),
    },
    {
      field: 'status',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.connectors.connectorTable.columns.status',
        {
          defaultMessage: 'Ingestion status',
        }
      ),
      render: (connector: ConnectorItem) => {
        const label = ingestionStatusToText(connector.status);
        return (
          <EuiBadgeTo to={''} label={label} color={ingestionStatusToColor(connector.status)} />
        );
      },
    },
    {
      actions: [
        {
          description: i18n.translate(
            'xpack.enterpriseSearch.content.connectors.connectorTable.columns.actions.viewIndex',
            { defaultMessage: 'View this connector' }
          ),
          icon: 'eye',
          isPrimary: false,
          name: (connector) =>
            i18n.translate(
              'xpack.enterpriseSearch.content.connectors.connectorsTable.columns.actions.viewIndex.caption',
              {
                defaultMessage: 'View index {connectorName}',
                values: {
                  connectorName: connector.connector_name,
                },
              }
            ),
          onClick: () => {},
          type: 'icon',
        },
        {
          color: 'danger',
          description: i18n.translate(
            'xpack.enterpriseSearch.content.connectorsTable.columns.actions.delete',
            {
              defaultMessage: 'Delete this connector',
            }
          ),
          icon: 'trash',
          isPrimary: false,
          name: (connector) =>
            i18n.translate(
              'xpack.enterpriseSearch.content.connectors.connectorsTable.actions.delete.caption',
              {
                defaultMessage: 'Delete index {connectorName}',
                values: {
                  connectorName: connector.connector_name,
                },
              }
            ),
          onClick: () => {},
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
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.enterpriseSearch.connectorsTable.h2.availableConnectorsLabel"
              defaultMessage="Available Connectors"
            />
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSearchBar />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiBasicTable
          items={items}
          columns={columns}
          onChange={() => {}}
          pagination={{
            pageIndex: 0,
            pageSize: 10,
            pageSizeOptions: [10, 0],
            totalItemCount: 15,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
