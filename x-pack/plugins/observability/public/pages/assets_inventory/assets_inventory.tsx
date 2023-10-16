/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDataGrid,
  EuiDataGridColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
} from '@elastic/eui';
import { Asset, AssetFilters } from '@kbn/assetManager-plugin/common/types_api';

import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useEffect, useState } from 'react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { ObservabilityPublicPluginsStart } from '../../plugin';
import { SearchBar } from './components/search_bar';

const TestBox: React.FC = ({ children }) => (
  <div style={{ padding: 20, border: '1px solid magenta' }}>{children}</div>
);

export function AssetsInventoryPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const { services } = useKibana<ObservabilityPublicPluginsStart>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hosts, setHosts] = useState<Asset[]>([]);
  const [filters, setFilters] = useState<AssetFilters>({});

  useEffect(() => {
    async function retrieve() {
      setIsLoading(true);
      const { hosts } = await services.assetManager.publicAssetsClient.getHosts({
        from: 'now-1d',
        filters,
      });
      setHosts(hosts);
      setIsLoading(false);
    }
    retrieve();
  }, [services, filters]);

  return (
    <ObservabilityPageTemplate
      data-test-subj="assetsInventoryPageWithData"
      pageHeader={{
        pageTitle: (
          <>
            {i18n.translate('xpack.observability.assetsInventoryTitle', {
              defaultMessage: 'Hosts Inventory',
            })}{' '}
          </>
        ),
      }}
    >
      <EuiFlexGroup>
        <EuiFlexItem>
          <SearchBar
            onSubmit={(filters) => {
              console.log('incoming filters', filters);
              setFilters(filters);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          Show filters:{' '}
          <pre>
            <code>{JSON.stringify(filters, null, 2)}</code>
          </pre>
        </EuiFlexItem>
        <EuiFlexItem>
          <TestBox>
            <div style={{ width: '200px' }}>Date picker xyz</div>
          </TestBox>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFlexGroup direction="row" gutterSize="m">
        <EuiFlexItem grow={false}>
          <TestBox>
            <div style={{ width: '100px' }}>Sidebar area</div>
          </TestBox>
        </EuiFlexItem>
        <EuiFlexItem style={{ height: '75vh' }}>
          {isLoading ? <EuiProgress /> : <AssetsTable assets={hosts} />}
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}

function isAssetKey(asset: Asset | undefined, key: string): key is keyof Asset {
  return typeof asset !== 'undefined' && key in asset;
}

type ColumnDef = { id: keyof Asset } & EuiDataGridColumn;

function AssetsTable({ assets }: { assets: Asset[] }) {
  const columns: ColumnDef[] = [
    {
      id: '@timestamp',
      displayAsText: 'Last Seen',
      schema: 'datetime',
    },
    {
      id: 'asset.ean',
      displayAsText: 'EAN',
    },
    {
      id: 'asset.kind',
      displayAsText: 'Kind',
    },
    {
      id: 'cloud.provider',
      displayAsText: 'Cloud Provider',
    },
    {
      id: 'cloud.region',
      displayAsText: 'CSP Region',
    },
  ];

  return (
    <EuiDataGrid
      aria-label="Assets table grid"
      columns={columns}
      columnVisibility={{
        visibleColumns: ['@timestamp', 'asset.ean', 'asset.kind', 'cloud.provider', 'cloud.region'],
        setVisibleColumns: () => {},
      }}
      rowCount={Math.min(assets.length, 100)}
      renderCellValue={({ rowIndex, columnId }) => {
        return isAssetKey(assets[rowIndex], columnId) ? `${assets[rowIndex][columnId]}` : null;
      }}
    />
  );
}
