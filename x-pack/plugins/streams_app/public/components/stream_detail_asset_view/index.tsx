/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiPopover,
  EuiSearchBar,
  EuiSelectable,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StreamDefinition } from '@kbn/streams-plugin/common';
import React, { useMemo, useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { AddAssetFlyout } from './add_asset_flyout';
import { AssetTable } from './asset_table';

export function StreamDetailAssetView({ definition }: { definition?: StreamDefinition }) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const [query, setQuery] = useState('');

  const [isTagsPopoverOpen, setIsTagsPopoverOpen] = useState(false);

  const [isAddAssetFlyoutOpen, setIsAddAssetFlyoutOpen] = useState(false);

  const tagsButton = (
    <EuiFilterButton iconType="arrowDown" isSelected={isTagsPopoverOpen}>
      {i18n.translate('xpack.streams.streamDetailAssetView.tagsFilterButtonLabel', {
        defaultMessage: 'Tags',
      })}
    </EuiFilterButton>
  );

  const assetsFetch = useStreamsAppFetch(
    ({ signal }) => {
      if (!definition?.id) {
        return Promise.resolve(undefined);
      }
      return streamsRepositoryClient.fetch('GET /api/streams/{id}/assets', {
        signal,
        params: {
          path: {
            id: definition.id,
          },
        },
      });
    },
    [definition?.id, streamsRepositoryClient]
  );

  const selectedAssets = useMemo(() => {
    return assetsFetch.value?.assets ?? [];
  }, [assetsFetch.value?.assets]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup direction="row" gutterSize="s">
        <EuiSearchBar
          query={query}
          box={{
            incremental: true,
          }}
          onChange={(nextQuery) => {
            setQuery(nextQuery.queryText);
          }}
        />
        <EuiFilterGroup>
          <EuiPopover button={tagsButton} isOpen={isTagsPopoverOpen}>
            <EuiSelectable />
          </EuiPopover>
        </EuiFilterGroup>
        <EuiButton
          data-test-subj="streamsAppStreamDetailAddAssetButton"
          iconType="plusInCircle"
          onClick={() => {
            setIsAddAssetFlyoutOpen(true);
          }}
        >
          {i18n.translate('xpack.streams.streamDetailAssetView.addAnAssetButtonLabel', {
            defaultMessage: 'Add an asset',
          })}
        </EuiButton>
      </EuiFlexGroup>
      <AssetTable assetsFetch={assetsFetch} />
      {definition && isAddAssetFlyoutOpen ? (
        <AddAssetFlyout
          selectedAssets={selectedAssets}
          entityId={definition.id}
          onAssetsChange={(assets) => {}}
          onClose={() => {
            setIsAddAssetFlyoutOpen(false);
          }}
        />
      ) : null}
    </EuiFlexGroup>
  );
}
