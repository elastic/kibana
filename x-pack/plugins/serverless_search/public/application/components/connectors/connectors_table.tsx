/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Criteria,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiI18nNumber,
  EuiIcon,
  EuiLink,
  EuiSearchBar,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  Connector,
  ConnectorStatus,
  SyncStatus,
  syncStatusToColor,
  syncStatusToText,
} from '@kbn/search-connectors';
import React, { useEffect, useState } from 'react';
import { CONNECTORS_LABEL } from '../../../../common/i18n_string';
import { useConnectors } from '../../hooks/api/use_connectors';
import { useConnectorTypes } from '../../hooks/api/use_connector_types';

export const ConnectorsTable: React.FC = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState<string>('');

  const { data, isError } = useConnectors();
  const { data: connectorTypes } = useConnectorTypes();

  type Filter = 'service_type' | 'name' | 'last_sync_status' | 'description' | 'service_type';
  const [filter, setFilter] = useState<Filter>('name');

  useEffect(() => {
    if (query) {
      setPageIndex(0);
    }
  }, [query, filter]);

  if (isError) {
    return <EuiEmptyPrompt>Could not fetch data</EuiEmptyPrompt>;
  }

  const connectedLabel = i18n.translate('xpack.serverlessSearch.connectors.connected', {
    defaultMessage: 'Connected',
  });

  const configuredLabel = i18n.translate('xpack.serverlessSearch.connectors.configuredLabel', {
    defaultMessage: 'Configured',
  });

  const typeLabel = i18n.translate('xpack.serverlessSearch.connectors.typeLabel', {
    defaultMessage: 'Type',
  });

  const nameLabel = i18n.translate('xpack.serverlessSearch.connectors.nameLabel', {
    defaultMessage: 'Name',
  });

  const syncStatusLabel = i18n.translate('xpack.serverlessSearch.connectors.syncStatusLabel', {
    defaultMessage: 'Sync status',
  });

  const filterOptions: Array<{ text: string; value: Filter }> = [
    { text: nameLabel, value: 'name' },
    { text: typeLabel, value: 'service_type' },
    {
      text: i18n.translate('xpack.serverlessSearch.connectors.descriptionLabel', {
        defaultMessage: 'Description',
      }),
      value: 'description',
    },
    { text: syncStatusLabel, value: 'last_sync_status' },
  ];

  const columns: Array<EuiBasicTableColumn<Connector>> = [
    {
      field: 'name',
      name: nameLabel,
      render: (name: string, connector: Connector) => (
        <EuiLink href="TODO TODO TODO">{name || connector.id}</EuiLink>
      ),
      truncateText: true,
    },
    {
      field: 'service_type',
      name: typeLabel,
      render: (serviceType: string | null) => {
        const typeData = (connectorTypes?.connectors || []).find(
          (connector) => connector.serviceType === (serviceType ?? '')
        );
        if (!typeData) {
          return <></>;
        }
        return (
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={typeData.iconPath} aria-label={typeData.name} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">{typeData.name}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'status',
      name: connectedLabel,
      render: (status: ConnectorStatus) =>
        status === ConnectorStatus.CONNECTED ? (
          <EuiIcon aria-label={connectedLabel} color="success" type="checkInCircleFilled" />
        ) : (
          <EuiBadge>
            {i18n.translate('xpack.serverlessSearch.connectors.notConnectedLabel', {
              defaultMessage: 'Not connected',
            })}
          </EuiBadge>
        ),
    },
    {
      field: 'status',
      name: configuredLabel,
      render: (status: ConnectorStatus) =>
        [ConnectorStatus.CONNECTED, ConnectorStatus.CONFIGURED].includes(status) ? (
          <EuiIcon aria-label={configuredLabel} color="success" type="checkInCircleFilled" />
        ) : (
          <EuiBadge>
            {i18n.translate('xpack.serverlessSearch.connectors.notConfiguredLabel', {
              defaultMessage: 'Not configured',
            })}
          </EuiBadge>
        ),
    },
    {
      field: 'last_sync_status',
      name: syncStatusLabel,
      render: (syncStatus: SyncStatus | null) =>
        syncStatus ? (
          <EuiBadge color={syncStatusToColor(syncStatus)}>{syncStatusToText(syncStatus)}</EuiBadge>
        ) : (
          <EuiBadge>
            {i18n.translate('xpack.serverlessSearch.connectors.notSyncedLabel', {
              defaultMessage: 'Not synced',
            })}
          </EuiBadge>
        ),
    },
  ];

  const items =
    data?.connectors
      .filter((connector) =>
        filter ? `${connector[filter]}`.toLowerCase().includes(query.toLowerCase()) : true
      )
      .slice(pageIndex * pageSize, pageIndex + 1 * pageSize) ?? [];

  return (
    <>
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <EuiSearchBar onChange={({ queryText }) => setQuery(queryText ?? '')} query={query} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            onChange={(e) => setFilter(e.currentTarget.value as Filter)}
            options={filterOptions}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
      <EuiText size="xs">
        <FormattedMessage
          id="xpack.enterpriseSearch.analytics.collectionsView.explorer.tableSummaryIndeterminate"
          defaultMessage="Showing {items} of {count} {connectors}"
          values={{
            connectors: <strong>{CONNECTORS_LABEL}</strong>,
            items: (
              <strong>
                <EuiI18nNumber value={(pageIndex + 1) * pageSize} />-
                <EuiI18nNumber value={pageIndex + 2 * pageSize} />
              </strong>
            ),
            count: <EuiI18nNumber value={items.length} />,
          }}
        />
      </EuiText>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiBasicTable
        columns={columns}
        items={items}
        onChange={({ page }: Criteria<Connector>) => {
          if (page) {
            const { index, size } = page;
            setPageIndex(index);
            setPageSize(size);
          }
        }}
        pagination={{
          pageIndex,
          pageSize,
          totalItemCount: data?.connectors.length ?? 0,
        }}
      />
    </>
  );
};
