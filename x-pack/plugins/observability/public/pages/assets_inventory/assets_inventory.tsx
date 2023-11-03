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
  EuiSuperDatePicker,
  OnTimeChangeProps,
} from '@elastic/eui';
import { Asset, AssetFilters } from '@kbn/assetManager-plugin/common/types_api';

import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useCallback, useEffect, useState } from 'react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { ObservabilityPublicPluginsStart } from '../../plugin';
import { SearchBar } from './components/search_bar';
import { SearchError } from './components/search_error';

const TestBox: React.FC = ({ children }) => (
  <div style={{ padding: 20, border: '1px solid magenta' }}>{children}</div>
);

export function AssetsInventoryPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const { services } = useKibana<ObservabilityPublicPluginsStart>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hosts, setHosts] = useState<Asset[]>([]);
  const [filters, setFilters] = useState<AssetFilters>({});
  const [start, setStart] = useState<string>('now-1h');
  const [end, setEnd] = useState<string>('now');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function retrieve() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await services.assetManager.publicAssetsClient.getHosts({
          from: start,
          to: end,
          filters,
        });
        setHosts(result.hosts);
        setIsLoading(false);
      } catch (error: any) {
        setIsLoading(false);
        console.log(error);
        const message = typeof error.message === 'string' ? error.message : `${error}`;
        setError(message);
      }
    }
    retrieve();
  }, [services, filters, start, end]);

  const onTimeChange = useCallback((update: OnTimeChangeProps) => {
    setStart(update.start);
    setEnd(update.end);
  }, []);

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
          <SearchError error={error} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <SearchBar
            onSubmit={(submittedFilters) => {
              setError(null);
              setFilters(submittedFilters);
            }}
          />
        </EuiFlexItem>
        {/* <EuiFlexItem>
          <FormattedMessage
            id="app_not_found_in_i18nrc.assetsInventoryPage.showFilters:FlexItemLabel"
            defaultMessage="Show filters:"
          />{' '}
          <pre>
            <code>{JSON.stringify(filters, null, 2)}</code>
          </pre>
        </EuiFlexItem> */}
        <EuiFlexItem>
          <EuiSuperDatePicker
            isLoading={isLoading}
            start={start}
            end={end}
            onTimeChange={onTimeChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFlexGroup direction="row" gutterSize="m">
        <EuiFlexItem grow={false}>
          <TestBox>
            <div style={{ width: '100px' }}>
              {i18n.translate('app_not_found_in_i18nrc.assetsInventoryPage.div.sidebarAreaLabel', {
                defaultMessage: 'Sidebar area',
              })}
            </div>
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
      id: 'asset.type',
      displayAsText: 'Type',
    },
    {
      id: 'cloud.provider',
      displayAsText: 'Cloud Provider',
    },
    {
      id: 'cloud.region',
      displayAsText: 'Cloud Region',
    },
  ];

  return (
    <EuiDataGrid
      aria-label="Assets table grid"
      columns={columns}
      columnVisibility={{
        visibleColumns: [
          '@timestamp',
          'asset.ean',
          'asset.kind',
          'asset.type',
          'cloud.provider',
          'cloud.region',
        ],
        setVisibleColumns: () => {},
      }}
      rowCount={Math.min(assets.length, 100)}
      renderCellValue={({ rowIndex, columnId }) => {
        return isAssetKey(assets[rowIndex], columnId) ? `${assets[rowIndex][columnId]}` : null;
      }}
    />
  );
}
