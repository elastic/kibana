/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { StreamDefinition } from '@kbn/streams-plugin/common';
import {
  EuiButton,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSearchBar,
  EuiSelectable,
} from '@elastic/eui';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useKibana } from '../../hooks/use_kibana';

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
        <EuiButton data-test-subj="streamsAppStreamDetailAssetViewButton" iconType="plusInCircle">
          {i18n.translate('xpack.streams.streamDetailAssetView.addAnAssetButtonLabel', {
            defaultMessage: 'Add an asset',
          })}
        </EuiButton>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
