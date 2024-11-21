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
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSearchBar,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Asset } from '@kbn/streams-plugin/common';
import { debounce } from 'lodash';
import React, { useMemo, useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { AssetTable } from './asset_table';

export function AddAssetFlyout({
  entityId,
  onAssetsChange,
  selectedAssets,
  onClose,
}: {
  entityId: string;
  onAssetsChange: (asset: Asset[]) => void;
  selectedAssets: Asset[];
  onClose: () => void;
}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const [query, setQuery] = useState('');

  const [submittedQuery, setSubmittedQuery] = useState(query);

  const setSubmittedQueryDebounced = useMemo(() => {
    return debounce(setSubmittedQuery, 150);
  }, []);

  const assetSuggestionsFetch = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient
        .fetch('GET /api/streams/{id}/assets/_suggestions', {
          signal,
          params: {
            path: {
              id: entityId,
            },
            query: {
              query: submittedQuery,
            },
          },
        })
        .then(({ suggestions }) => {
          return {
            assets: suggestions
              .map((suggestion) => suggestion.asset)
              .filter((asset) => {
                return !selectedAssets.find(
                  (selectedAsset) =>
                    selectedAsset.assetId === asset.assetId && selectedAsset.type === asset.type
                );
              }),
          };
        });
    },
    [streamsRepositoryClient, entityId, submittedQuery, selectedAssets]
  );

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.streams.addAssetFlyout.flyoutHeaderLabel', {
              defaultMessage: 'Add assets',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiText size="s">
            {i18n.translate('xpack.streams.addAssetFlyout.helpLabel', {
              defaultMessage:
                'Select assets which you want to add and assign to the {stream} stream',
              values: {
                stream: entityId,
              },
            })}
          </EuiText>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiSearchBar
              box={{
                incremental: true,
              }}
              query={query}
              onChange={({ queryText }) => {
                setQuery(queryText);
                setSubmittedQueryDebounced(queryText);
              }}
            />
            <EuiFilterGroup>
              <EuiFilterButton>
                {i18n.translate('xpack.streams.addAssetFlyout.typeFilterButtonLabel', {
                  defaultMessage: 'Type',
                })}
              </EuiFilterButton>
            </EuiFilterGroup>
          </EuiFlexGroup>
          <AssetTable assetsFetch={assetSuggestionsFetch} compact />
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton data-test-subj="streamsAppAddAssetFlyoutAddAssetsButton" onClick={() => {}}>
          {i18n.translate('xpack.streams.addAssetFlyout.addAssetsButtonLabel', {
            defaultMessage: 'Add assets',
          })}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
