/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AbortableAsyncState } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import type { Asset } from '@kbn/streams-plugin/common';
import React, { useEffect, useMemo, useState } from 'react';
import { AssetTypeDisplay } from './asset_type_display';

export function AssetTable({
  assetsFetch,
  compact = false,
}: {
  assetsFetch: AbortableAsyncState<{ assets: Asset[] } | undefined>;
  compact?: boolean;
}) {
  const columns = useMemo((): Array<EuiBasicTableColumn<Asset>> => {
    return [
      {
        field: 'label',
        name: i18n.translate('xpack.streams.assetTable.assetNameColumnTitle', {
          defaultMessage: 'Asset name',
        }),
      },
      {
        field: 'type',
        name: i18n.translate('xpack.streams.assetTable.assetTypeColumnTitle', {
          defaultMessage: 'Type',
        }),
        render: (_, { type }) => {
          return <AssetTypeDisplay type={type} />;
        },
      },
      ...(!compact
        ? ([
            {
              field: 'tags',
              name: i18n.translate('xpack.streams.assetTable.tagsColumnTitle', {
                defaultMessage: 'Tags',
              }),
              render: (_, { tags }) => {
                return (
                  <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                    {tags.map((tag) => (
                      <EuiBadge key={tag} color="hollow">
                        {tag}
                      </EuiBadge>
                    ))}
                  </EuiFlexGroup>
                );
              },
            },
          ] satisfies Array<EuiBasicTableColumn<Asset>>)
        : []),
    ];
  }, [compact]);

  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);

  const items = useMemo(() => {
    return assetsFetch.value?.assets ?? [];
  }, [assetsFetch.value]);

  useEffect(() => {
    setSelectedAssets([]);
  }, [assetsFetch.value?.assets]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false} />
      <EuiBasicTable
        columns={columns}
        items={items}
        loading={assetsFetch.loading}
        selection={{
          onSelectionChange: (selection) => {
            setSelectedAssets(selection);
          },
          selected: selectedAssets,
        }}
      />
    </EuiFlexGroup>
  );
}
